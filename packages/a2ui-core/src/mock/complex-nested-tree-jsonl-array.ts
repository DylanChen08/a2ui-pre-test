import { protocolToPerComponentJsonlMessages } from "../jsonl-stream-buffer";
import type { A2UIMessage } from "../parser/index.ts";
import complexNestedTreeProtocol from "./complex-nested-tree.json";

export const complexNestedTreeJsonlArray: A2UIMessage[] =
  protocolToPerComponentJsonlMessages(complexNestedTreeProtocol);

export const complexNestedTreeJsonlText = complexNestedTreeJsonlArray
  .map((message) => JSON.stringify(message))
  .join("\n");
