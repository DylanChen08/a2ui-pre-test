import type { A2uiStore, HydrateNode } from "../store/index";
import type { VNode } from "../vnode/index";

/**
 * 由 HydrateNode 组装成的组件树节点（当前为占位：仅挂 surface.root，不解析协议 children）。
 * 后续可在此根据协议中的子组件引用递归填充 `children`。
 */
export interface ComponentTreeNode {
  componentId: string;
  ownerSurfaceId: string;
  vnode: VNode | null;
  children: ComponentTreeNode[];
}

function normalizeVNode(raw: unknown): VNode | null {
  if (raw == null || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.type === "string") {
    return {
      type: o.type,
      props:
        typeof o.props === "object" && o.props !== null
          ? (o.props as Record<string, unknown>)
          : undefined,
      children: normalizeVNodeChildren(o.children),
    };
  }
  if (o.type != null) {
    return { type: "[opaque]", props: { hint: "non-string vnode (e.g. host component)" } };
  }
  return null;
}

function normalizeVNodeChildren(ch: unknown): VNode[] | undefined {
  if (!Array.isArray(ch)) {
    return undefined;
  }
  const out: VNode[] = [];
  for (const c of ch) {
    const n = normalizeVNode(c);
    if (n) {
      out.push(n);
    }
  }
  return out.length ? out : undefined;
}

function stubTreeFromHydrateNode(node: HydrateNode): ComponentTreeNode {
  return {
    componentId: node.componentId,
    ownerSurfaceId: node.ownerSurfaceId,
    vnode: normalizeVNode(node._vnode),
    children: [],
  };
}

/**
 * 根据当前 store 中的 surface 与 hydrate 节点生成组件树列表（每个 surface 一棵根树）。
 * 子节点组装逻辑暂未实现，`children` 恒为空数组。
 */
export function buildComponentTrees(
  state: Pick<A2uiStore, "surfaceMap">
): ComponentTreeNode[] {
  return Object.values(state.surfaceMap).map((surface) =>
    stubTreeFromHydrateNode(surface.rootNode)
  );
}
