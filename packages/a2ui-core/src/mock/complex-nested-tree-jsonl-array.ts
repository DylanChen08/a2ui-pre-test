import type { A2UIMessage } from "../parser/index.ts";
import complexNestedTreeProtocol from "./complex-nested-tree.json";

const surfaceId = complexNestedTreeProtocol.surfaceUpdate?.surfaceId ?? "";
const components = complexNestedTreeProtocol.surfaceUpdate?.components ?? [];

export const complexNestedTreeJsonlArray: A2UIMessage[] = [
  { beginRendering: complexNestedTreeProtocol.beginRendering },
  ...components.map((component) => ({
    surfaceUpdate: {
      surfaceId,
      components: [component],
    },
  })),
];

export const complexNestedTreeJsonlText = complexNestedTreeJsonlArray
  .map((message) => JSON.stringify(message))
  .join("\n");
