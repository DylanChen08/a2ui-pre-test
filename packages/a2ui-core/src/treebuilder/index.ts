import React from "react";
import type { A2uiStore } from "../store/index.ts";

export type RenderTree = {
  type: "root";
  children: any[];
};
export type ComponentTree = RenderTree;

type TreeBuilderState = Pick<A2uiStore, "surfaceMap" | "hydrateNodeMap">;

function parseProtocol(nodeProtocol: string): Record<string, any> | null {
  try {
    return JSON.parse(nodeProtocol) as Record<string, any>;
  } catch {
    return null;
  }
}

function getComponentPayload(protocol: Record<string, any> | null): Record<string, any> | null {
  if (!protocol?.component || typeof protocol.component !== "object") {
    return null;
  }
  return protocol.component as Record<string, any>;
}

function getComponentType(componentPayload: Record<string, any> | null): string {
  if (!componentPayload) return "unknown";
  return Object.keys(componentPayload)[0] ?? "unknown";
}

function getComponentProps(componentPayload: Record<string, any> | null): Record<string, any> {
  const type = getComponentType(componentPayload);
  const props = componentPayload?.[type];
  return props && typeof props === "object" ? props : {};
}

function collectChildIds(componentProps: Record<string, any>): string[] {
  const childIds: string[] = [];

  const pushUnique = (id?: unknown) => {
    if (typeof id === "string" && id.length > 0 && !childIds.includes(id)) {
      childIds.push(id);
    }
  };

  // 单子节点容器，如 Card/Button
  pushUnique(componentProps.child);
  // Modal
  pushUnique(componentProps.entryPointChild);
  pushUnique(componentProps.contentChild);

  // Tabs
  if (Array.isArray(componentProps.tabItems)) {
    componentProps.tabItems.forEach((tab: any) => pushUnique(tab?.child));
  }

  // Row/Column/List
  if (componentProps.children && typeof componentProps.children === "object") {
    if (Array.isArray(componentProps.children.explicitList)) {
      componentProps.children.explicitList.forEach((id: unknown) => pushUnique(id));
    }
    pushUnique(componentProps.children.template?.componentId);
  }

  return childIds;
}

function composeVNode(vnode: any, children: any[]) {
  if (React.isValidElement(vnode)) {
    return React.cloneElement(vnode, undefined, ...children);
  }
  if (vnode && typeof vnode === "object") {
    const nextProps =
      vnode.props && typeof vnode.props === "object"
        ? { ...vnode.props, children }
        : { children };
    return {
      ...vnode,
      props: nextProps,
      children,
    };
  }
  return vnode;
}

function buildNode(componentId: string, state: TreeBuilderState, visited: Set<string>): any {
  if (visited.has(componentId)) {
    return {
      type: "cycle",
      props: { id: componentId },
      children: [],
    };
  }

  const hydrateNode = state.hydrateNodeMap[componentId];
  if (!hydrateNode) {
    return {
      type: "missing",
      props: { id: componentId },
      children: [],
    };
  }

  const parsed = parseProtocol(hydrateNode.protocal);
  const componentPayload = getComponentPayload(parsed);
  const componentProps = getComponentProps(componentPayload);
  const childIds = collectChildIds(componentProps);

  visited.add(componentId);
  const children = childIds.map((id) => buildNode(id, state, visited));
  visited.delete(componentId);

  return composeVNode(hydrateNode._vnode, children);
}

export function buildRenderTree(state: TreeBuilderState): RenderTree {
  const rootIds = Object.values(state.surfaceMap)
    .map((surface) => surface.rootNode?.componentId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (rootIds.length === 0) {
    return { type: "root", children: [] };
  }

  const rootChildren = rootIds.map((rootId) => buildNode(rootId, state, new Set<string>()));
  return { type: "root", children: rootChildren };
}

// 兼容 parser 仍在使用的历史命名，避免运行时导出缺失
export const buildComponentTree = buildRenderTree;

