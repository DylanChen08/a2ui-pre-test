import type { A2UIProtocol } from "../parser/index.ts";
import type { VNode } from "../vnode/index.ts";

export type RenderTree = VNode;
export type ComponentTree = RenderTree;

export function buildRenderTree(protocol: A2UIProtocol): RenderTree {
  void protocol;
  // 架构占位：后续把协议转换为 VNode 渲染树
  return { type: "root" };
}

// 兼容 parser 仍在使用的历史命名，避免运行时导出缺失
export const buildComponentTree = buildRenderTree;

