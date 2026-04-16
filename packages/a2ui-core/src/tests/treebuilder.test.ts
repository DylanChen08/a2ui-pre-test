import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { a2uiParser, type A2UIMessage } from '../parser/index';
import { createA2uiStore } from '../store/index';
import { buildComponentTree } from '../treebuilder/index';

declare const describe: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;

describe('TreeBuilder', () => {
  let parserStore: ReturnType<typeof createA2uiStore>;

  beforeEach(() => {
    parserStore = createA2uiStore();
    a2uiParser.resetRuntimeState();
    a2uiParser.setStore(parserStore);
    // 只需要让 parser 能产出 vnode；具体渲染内容不是该用例重点
    parserStore.getState().setRenderMap({
      Column: (props: any) => ({ type: 'Column', props }),
      Text: (props: any) => ({ type: 'Text', props }),
    });
  });

  it('should build a column tree with three text children from mock', () => {
    const mockData = JSON.parse(
      readFileSync(join(__dirname, '../mock/column-three-text.json'), 'utf-8')
    ) as A2UIMessage;

    if (mockData.beginRendering) {
      a2uiParser.parseMessage({ beginRendering: mockData.beginRendering });
    }
    if (mockData.surfaceUpdate) {
      a2uiParser.parseMessage({ surfaceUpdate: mockData.surfaceUpdate });
    }

    const tree = buildComponentTree(parserStore.getState() as any);

    assert.ok(tree);
    assert.equal(tree.type, 'root');
    assert.equal(tree.children?.length, 1);

    const columnNode = tree.children![0];
    assert.equal(columnNode.type, 'Column');
    assert.equal(columnNode.props?.id, 'column-component');
    assert.equal(columnNode.children?.length, 3);

    const childIds = columnNode.children!.map((node: any) => node.props?.id);
    assert.deepEqual(childIds, [
      'text-component-1',
      'text-component-2',
      'text-component-3',
    ]);

    columnNode.children!.forEach((node: any) => {
      assert.equal(node.type, 'Text');
      assert.equal((node.children ?? []).length, 0);
    });
  });
});
