import React from "react";

export type A2UIRendererProps = {
  protocol: unknown;
};

export function A2UIRenderer(props: A2UIRendererProps) {
  void props;
  // 架构占位：后续把 protocol 渲染成 React 组件树
  return React.createElement("div", null, "A2UIRenderer (stub)");
}

