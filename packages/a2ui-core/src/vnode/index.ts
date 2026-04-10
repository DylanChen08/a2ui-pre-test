export type VNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: VNode[];
};

export function createVNode(type: string, props?: Record<string, unknown>, children?: VNode[]): VNode {
  return { type, props, children };
}

