import type {
  A2UIMessage,
  A2UIProtocol,
  BeginRendering,
  DataModelUpdate,
  DeleteSurface,
  SurfaceUpdate,
} from './parser/index';

/** 将 surfaceUpdate 拆成多条消息，每条仅含一个 component（与 JSONL 流式协议一致） */
export function expandSurfaceUpdateToMessages(surfaceUpdate: SurfaceUpdate): A2UIMessage[] {
  const { surfaceId, components } = surfaceUpdate;
  const list = components ?? [];
  if (list.length === 0) {
    return [{ surfaceUpdate: { surfaceId, components: [] } }];
  }
  return list.map((c) => ({
    surfaceUpdate: { surfaceId, components: [c] },
  }));
}

/**
 * 将完整协议对象（如 mock JSON）展开为逐行 JSONL 对应的消息数组：
 * beginRendering 一条；surfaceUpdate 按 component 拆分；其它键各一条。
 */
export function protocolToPerComponentJsonlMessages(
  protocol: Partial<A2UIProtocol> | Record<string, unknown>
): A2UIMessage[] {
  const messages: A2UIMessage[] = [];
  const p = protocol as Partial<A2UIProtocol>;

  if (p.beginRendering) {
    messages.push({ beginRendering: p.beginRendering as BeginRendering });
  }
  if (p.surfaceUpdate) {
    messages.push(...expandSurfaceUpdateToMessages(p.surfaceUpdate as SurfaceUpdate));
  }
  if (p.dataModelUpdate) {
    messages.push({ dataModelUpdate: p.dataModelUpdate as DataModelUpdate });
  }
  if (p.deleteSurface) {
    messages.push({ deleteSurface: p.deleteSurface as DeleteSurface });
  }
  return messages;
}

/**
 * 解析得到的单行 JSON 可能一次包含多个顶层动作，或 surfaceUpdate 含多个 component。
 * 规范化为 parser 可逐条处理的 A2UIMessage 列表。
 */
export function expandParsedA2UIPayload(parsed: unknown): A2UIMessage[] {
  if (parsed === null || typeof parsed !== 'object') {
    return [];
  }
  const o = parsed as Record<string, unknown>;
  const messages: A2UIMessage[] = [];

  if (o.beginRendering) {
    messages.push({ beginRendering: o.beginRendering as BeginRendering });
  }
  if (o.surfaceUpdate) {
    messages.push(...expandSurfaceUpdateToMessages(o.surfaceUpdate as SurfaceUpdate));
  }
  if (o.dataModelUpdate) {
    messages.push({ dataModelUpdate: o.dataModelUpdate as DataModelUpdate });
  }
  if (o.deleteSurface) {
    messages.push({ deleteSurface: o.deleteSurface as DeleteSurface });
  }

  return messages;
}

export interface JsonlStreamMalformedLine {
  /** 尝试解析的片段（截断以免过长） */
  fragment: string;
  message: string;
}

export interface ConsumeJsonlResult {
  messages: A2UIMessage[];
  malformedLines: JsonlStreamMalformedLine[];
}

/**
 * 累积文本流，按 JSONL 规则抽出「完整一行 JSON」并规范化为可交给 parseMessage 的消息。
 * 无换行时若缓冲区已是合法完整 JSON（整段即一条消息），也会在 consume / finalize 时产出。
 */
export class A2UIJsonlStreamBuffer {
  private buf = '';

  /** 追加一段模拟流式输出（任意截断位置） */
  append(chunk: string): void {
    this.buf += chunk;
  }

  getPendingLength(): number {
    return this.buf.length;
  }

  /** 清空内部缓冲（一般不调用，除非放弃当前流） */
  reset(): void {
    this.buf = '';
  }

  /**
   * 从缓冲区取出所有已完整的 JSONL 记录（不含末尾未完成片段）。
   */
  consumeCompleteLines(): ConsumeJsonlResult {
    const messages: A2UIMessage[] = [];
    const malformedLines: JsonlStreamMalformedLine[] = [];

    while (true) {
      const nl = this.buf.indexOf('\n');
      if (nl < 0) {
        break;
      }

      const line = this.buf.slice(0, nl);
      this.buf = this.buf.slice(nl + 1);

      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      try {
        const parsed = JSON.parse(trimmed);
        messages.push(...expandParsedA2UIPayload(parsed));
      } catch (e) {
        malformedLines.push({
          fragment: trimmed.slice(0, 200),
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return { messages, malformedLines };
  }

  /**
   * 尝试将当前无尾换行的缓冲当作完整 JSON 解析（用于单行 JSON 或流结束 flush）。
   */
  tryConsumeBufferedObject(): ConsumeJsonlResult {
    const messages: A2UIMessage[] = [];
    const malformedLines: JsonlStreamMalformedLine[] = [];

    const trimmed = this.buf.trim();
    if (!trimmed) {
      this.buf = '';
      return { messages, malformedLines };
    }

    try {
      const parsed = JSON.parse(trimmed);
      this.buf = '';
      messages.push(...expandParsedA2UIPayload(parsed));
    } catch {
      // 仍不完整或非法，保留 buf
    }

    return { messages, malformedLines };
  }

  /**
   * 一次 consume：先处理所有完整行，再在无换行剩余上尝试整体 JSON.parse。
   */
  consume(): ConsumeJsonlResult {
    const lineResult = this.consumeCompleteLines();
    const restResult = this.tryConsumeBufferedObject();

    return {
      messages: [...lineResult.messages, ...restResult.messages],
      malformedLines: [...lineResult.malformedLines, ...restResult.malformedLines],
    };
  }

  /**
   * 流结束：强制解析剩余缓冲（若无尾换行仍应是合法 JSON）；残留无法解析则记入 malformed。
   */
  finalize(): ConsumeJsonlResult {
    const messages: A2UIMessage[] = [];
    const malformedLines: JsonlStreamMalformedLine[] = [];

    const tail = this.buf.trim();
    this.buf = '';

    if (!tail) {
      return { messages, malformedLines };
    }

    try {
      const parsed = JSON.parse(tail);
      messages.push(...expandParsedA2UIPayload(parsed));
    } catch (e) {
      malformedLines.push({
        fragment: tail.slice(0, 200),
        message: e instanceof Error ? e.message : String(e),
      });
    }

    return { messages, malformedLines };
  }
}

export interface SimulateJsonlStreamOptions {
  /** 每次输出的字符数，默认 50 */
  chunkSize?: number;
  /** 间隔毫秒，默认 50 */
  intervalMs?: number;
}

/**
 * 将完整 JSONL 文本按固定块大小与间隔切片，用于模拟网络/模型流式输出。
 * 返回清除定时器函数。
 */
export function simulateJsonlStream(
  fullText: string,
  onChunk: (chunk: string, state: { offset: number; total: number; done: boolean }) => void,
  options?: SimulateJsonlStreamOptions
): () => void {
  const chunkSize = options?.chunkSize ?? 50;
  const intervalMs = options?.intervalMs ?? 50;
  const total = fullText.length;
  let offset = 0;

  if (total === 0) {
    onChunk('', { offset: 0, total: 0, done: true });
    return () => {};
  }

  const id = setInterval(() => {
    if (offset >= total) {
      clearInterval(id);
      return;
    }
    const chunk = fullText.slice(offset, offset + chunkSize);
    offset += chunkSize;
    onChunk(chunk, { offset: Math.min(offset, total), total, done: offset >= total });
  }, intervalMs);

  return () => clearInterval(id);
}
