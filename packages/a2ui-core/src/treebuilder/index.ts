import type { A2UIProtocol } from "../parser/index.js";
import type { VNode } from "../vnode/index.js";

export type RenderTree = VNode;

export function buildRenderTree(protocol: A2UIProtocol): RenderTree {
  void protocol;
  // 架构占位：后续把协议转换为 VNode 渲染树
  return { type: "root" };
}

