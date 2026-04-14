import type { HydrateNode, Surface } from "../store/index";
import type { VNode } from "../vnode/index";

/** 可序列化的组件树节点（后续可在此填充真实父子组装逻辑） */
export type ComponentTreeNode = {
  componentId: string;
  /** 从 HydrateNode._vnode 提取的预览结构，便于 JSON 展示 */
  vnodePreview: unknown;
  children: ComponentTreeNode[];
};

export type SurfaceComponentTree = {
  surfaceId: string;
  root: ComponentTreeNode | null;
};

export type ComponentTree = {
  surfaces: SurfaceComponentTree[];
};

export type RenderTree = VNode;

function shallowPlainProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (k === "children") continue;
    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean" || v === null) {
      out[k] = v;
    } else if (t === "object" && v !== null && !Array.isArray(v)) {
      try {
        JSON.stringify(v);
        out[k] = v;
      } catch {
        out[k] = "[object]";
      }
    } else {
      out[k] = `[${t}]`;
    }
  }
  return out;
}

/** 将运行时 vnode 压成可 JSON 化的预览（避免循环引用） */
export function summarizeVNode(vnode: unknown, depth = 0): unknown {
  if (depth > 8) return "[max depth]";
  if (vnode == null) return null;
  if (typeof vnode !== "object") return vnode;
  const o = vnode as Record<string, unknown>;
  const type = o.type;
  const typeStr =
    typeof type === "string"
      ? type
      : typeof type === "function"
        ? (type as (...args: unknown[]) => unknown).name || "anonymous"
        : String(type);
  const out: Record<string, unknown> = { type: typeStr };
  if (o.props && typeof o.props === "object" && o.props !== null && !Array.isArray(o.props)) {
    out.props = shallowPlainProps(o.props as Record<string, unknown>);
  }
  if (Array.isArray(o.children)) {
    out.children = (o.children as unknown[]).map((c) => summarizeVNode(c, depth + 1));
  }
  return out;
}

function hydrateToTreeNode(node: HydrateNode): ComponentTreeNode {
  return {
    componentId: node.componentId,
    vnodePreview: summarizeVNode(node._vnode),
    // 占位：多子节点时后续根据协议 children 引用在此组装
    children: [],
  };
}

/**
 * 根据当前 store 中的 surface 与 hydrate 节点构建组件树。
 * 当前仅将各 surface 的 root HydrateNode 挂为树根，children 为空数组。
 */
export function buildComponentTree(state: {
  surfaceMap: Record<string, Surface>;
  hydrateNodeMap: Record<string, HydrateNode>;
}): ComponentTree {
  const { surfaceMap } = state;
  const surfaces: SurfaceComponentTree[] = [];
  for (const surface of Object.values(surfaceMap)) {
    const root = surface.rootNode ? hydrateToTreeNode(surface.rootNode) : null;
    surfaces.push({ surfaceId: surface.surfaceId, root });
  }
  return { surfaces };
}

/** 协议 → VNode 完整渲染树（占位，与组件树分离演进） */
export function buildRenderTree(_protocol: unknown): RenderTree {
  void _protocol;
  return { type: "root" };
}
