import {
  createA2uiStore,
  HydrateNode,
  Surface,
  ErrorType,
  type RenderFunction,
  type RenderMap,
} from '../store/index';
import React from 'react';
import { StoreApi } from 'zustand/vanilla';
import { buildComponentTree, type ComponentTree } from '../treebuilder/index';

export interface Component {
  id: string;
  weight?: number;
  component: Record<string, any>;
}

export interface SurfaceUpdate {
  surfaceId: string;
  components: Component[];
}

export interface BeginRendering {
  surfaceId: string;
  catalogId?: string;
  root: string;
  styles?: Record<string, any>;
}

export interface DataModelUpdate {
  surfaceId: string;
  path?: string;
  contents: Array<{
    key: string;
    valueString?: string;
    valueNumber?: number;
    valueBoolean?: boolean;
    valueMap?: Array<{
      key: string;
      valueString?: string;
      valueNumber?: number;
      valueBoolean?: boolean;
    }>;
  }>;
}

export interface DeleteSurface {
  surfaceId: string;
}

export interface A2UIProtocol {
  beginRendering?: BeginRendering;
  surfaceUpdate?: SurfaceUpdate;
  dataModelUpdate?: DataModelUpdate;
  deleteSurface?: DeleteSurface;
}

export type A2UIMessage = A2UIProtocol;

export type { RenderFunction, RenderMap };

export interface ParserResult {
  surface?: Surface;
  hydrateNodes?: HydrateNode[];
  dataModelUpdate?: DataModelUpdate;
  deleteSurface?: DeleteSurface;
}

export interface ApplyJSONLResult {
  messages: A2UIMessage[];
  componentTree: ComponentTree;
  /** 某行 JSON 解析失败或 parseMessage 抛错时的记录（行号为 JSONL 从 1 起的行号） */
  parseErrors: Array<{ line: number; message: string }>;
}

class A2UIParser {
  private store: StoreApi<any>;
  
  constructor() {
    this.store = createA2uiStore();
  }
  
  setStore(store: StoreApi<any>) {
    this.store = store;
  }
  
  resetRuntimeState() {
    // 重置运行时状态
  }
  
  parseMessage(message: A2UIMessage): ParserResult {
    let result: ParserResult;

    if (message.beginRendering) {
      result = this.parseBeginRendering(message.beginRendering);
    } else if (message.surfaceUpdate) {
      result = this.parseSurfaceUpdate(message.surfaceUpdate);
    } else if (message.dataModelUpdate) {
      result = this.parseDataModelUpdate(message.dataModelUpdate);
    } else if (message.deleteSurface) {
      result = this.parseDeleteSurface(message.deleteSurface);
    } else {
      throw new Error('Invalid A2UI message: no action specified');
    }

    const hooks = this.store.getState().parseLifecycleHooks;
    hooks?.onAfterParseMessage?.(message, result);

    return result;
  }
  
  parseBeginRendering(beginRendering: BeginRendering): ParserResult {
    const { surfaceId, root, catalogId } = beginRendering;
    
    // 检查hydrateNodeMap中是否已经存在该node
    let rootNode = this.store.getState().getHydrateNode(root);
    
    // 如果不存在，创建一个新的rootNode
    if (!rootNode) {
      rootNode = {
        componentId: root,
        _vnode: null,
        ownerSurfaceId: surfaceId,
        protocal: JSON.stringify(beginRendering),
        hydrateHasMounted: false,
      };
      // 添加到store
      this.store.getState().addHydrateNode(rootNode);
    }
    
    // 创建surface，rootNode直接指向hydrateNodeMap中的node
    const surface: Surface = {
      surfaceId,
      beginrender: true,
      rootNode,
      ...(catalogId !== undefined ? { catalogId } : {}),
    };
    
    // 添加到store
    this.store.getState().addSurface(surface);
    
    return { surface };
  }
  
  parseSurfaceUpdate(surfaceUpdate: SurfaceUpdate): ParserResult {
    const { surfaceId, components } = surfaceUpdate;
    
    const hydrateNodes: HydrateNode[] = [];
    
    // 处理每个组件
    for (const component of components) {
      const { id, component: componentData } = component;
      
      // 渲染组件
      const _vnode = this.renderComponent(id, componentData, surfaceId);
      
      // 创建hydrateNode
      const hydrateNode: HydrateNode = {
        componentId: id,
        _vnode,
        ownerSurfaceId: surfaceId,
        protocal: JSON.stringify(component),
        hydrateHasMounted: false,
      };
      
      // 添加到store
      this.store.getState().addHydrateNode(hydrateNode);
      hydrateNodes.push(hydrateNode);
    }
    
    // 检查是否已经存在surface
    let surface = this.store.getState().getSurface(surfaceId);
    if (!surface && components.length > 0) {
      // 获取第一个组件的id
      const rootComponentId = components[0].id;
      // 从hydrateNodeMap中获取对应的node
      const rootNode = this.store.getState().getHydrateNode(rootComponentId);
      if (rootNode) {
        // 创建新的surface，rootNode直接指向hydrateNodeMap中的node
        surface = {
          surfaceId,
          beginrender: false,
          rootNode
        };
        this.store.getState().addSurface(surface);
      }
    }
    
    return { surface, hydrateNodes };
  }
  
  parseDataModelUpdate(dataModelUpdate: DataModelUpdate): ParserResult {
    const { surfaceId, path, contents } = dataModelUpdate;
    
    // 处理数据模型更新
    for (const content of contents) {
      const { key, valueString, valueNumber, valueBoolean, valueMap } = content;
      let value;
      
      if (valueString !== undefined) {
        value = valueString;
      } else if (valueNumber !== undefined) {
        value = valueNumber;
      } else if (valueBoolean !== undefined) {
        value = valueBoolean;
      } else if (valueMap !== undefined) {
        value = valueMap;
      }
      
      if (value !== undefined) {
        // 简单的路径处理
        const updatePath = path ? `${path}/${key}` : key;
        this.store.getState().updateDataModel(surfaceId, updatePath, value);
      }
    }
    
    return { dataModelUpdate };
  }
  
  parseDeleteSurface(deleteSurface: DeleteSurface): ParserResult {
    const { surfaceId } = deleteSurface;
    
    // 获取store中的hydrateNodeMap
    const hydrateNodeMap = this.store.getState().hydrateNodeMap;
    
    // 找出该surface下的所有hydrateNode
    const nodesToDelete = Object.values(hydrateNodeMap).filter((node): node is HydrateNode => {
      return (node as HydrateNode).ownerSurfaceId === surfaceId;
    });
    
    // 删除这些hydrateNode
    for (const node of nodesToDelete) {
      this.store.getState().removeHydrateNode(node.componentId);
    }
    
    // 从store中移除surface
    this.store.getState().removeSurface(surfaceId);
    
    return { deleteSurface };
  }
  
  renderComponent(componentId: string, componentData: Record<string, any>, surfaceId: string): any {
    const state = this.store.getState();
    const renderMap = state.renderMap;
    const surface = state.getSurface(surfaceId);
    const catalogId = surface?.catalogId;

    const errEmpty = `renderer:${surfaceId}:${componentId}:empty-type`;
    const errMissing = `renderer:${surfaceId}:${componentId}:not-registered`;

    const clearRendererErrors = () => {
      state.removeError(errEmpty);
      state.removeError(errMissing);
    };

    // 获取组件类型（协议 component 为单键对象，键名即目录中的组件类型）
    const componentType = Object.keys(componentData)[0];
    if (!componentType) {
      state.removeError(errMissing);
      state.addError(errEmpty, {
        type: ErrorType.PARE_ERROR,
        content: `surface "${surfaceId}" 下组件 "${componentId}" 的 component 对象为空，无法解析协议组件类型。`,
      });
      return null;
    }

    const renderFunction = renderMap[componentType];
    const registered = typeof renderFunction === 'function';

    if (registered) {
      clearRendererErrors();
      const props = { ...componentData[componentType], id: componentId };
      const rendered = renderFunction(props);
      const vnode = this.attachComponentIdToRoot(rendered, componentId);

      const hydrateNode = state.getHydrateNode(componentId);
      if (hydrateNode) {
        state.updateHydrateNode(componentId, { ...hydrateNode, _vnode: vnode });
      }

      return vnode;
    }

    state.removeError(errEmpty);
    const catalogHint =
      catalogId !== undefined
        ? ` 当前 surface 的 catalogId 为 "${catalogId}"，请为该目录下的组件类型提供渲染实现。`
        : '';

    const reason =
      renderFunction === undefined
        ? `类型 "${componentType}" 未在 renderMap 中注册。`
        : `类型 "${componentType}" 在 renderMap 中有条目但不是可调用函数，无法作为渲染器使用。`;

    state.addError(errMissing, {
      type: ErrorType.RENDERER_NOT_REGISTERED,
      content: `surface "${surfaceId}" 下组件 "${componentId}"：${reason}请在 init 或 setRenderMap 中为该协议组件类型注册渲染函数。${catalogHint}`.trim(),
      details: {
        surfaceId,
        componentId,
        componentType,
        ...(catalogId !== undefined ? { catalogId } : {}),
      },
    });
    return null;
  }

  private attachComponentIdToRoot(vnode: any, componentId: string): any {
    if (!React.isValidElement(vnode)) {
      return vnode;
    }

    const existingProps = (vnode.props ?? {}) as Record<string, any>;
    const nextProps: Record<string, any> = {};

    if (existingProps.id === undefined) {
      nextProps.id = componentId;
    }
    if (existingProps['data-a2ui-id'] === undefined) {
      nextProps['data-a2ui-id'] = componentId;
    }

    if (Object.keys(nextProps).length === 0) {
      return vnode;
    }

    return React.cloneElement(vnode, nextProps);
  }
  
  parseJSONL(jsonl: string): A2UIMessage[] {
    try {
      // 分割JSONL格式的输入，每行一个JSON对象
      const lines = jsonl.trim().split('\n');
      const messages: A2UIMessage[] = [];

      // 解析每一行JSON
      for (const line of lines) {
        if (line.trim()) {
          const parsed = JSON.parse(line);
          messages.push(parsed as A2UIMessage);
        }
      }

      return messages;
    } catch (error) {
      // 如果解析失败，返回空数组
      console.error('Failed to parse JSONL:', error);
      return [];
    }
  }

  /**
   * 按行解析并依次应用 JSONL 中的每条 A2UI 消息，最后通过 TreeBuilder 生成组件树。
   */
  applyJSONL(jsonl: string): ApplyJSONLResult {
    const parseErrors: ApplyJSONLResult['parseErrors'] = [];
    const messages: A2UIMessage[] = [];
    const lines = jsonl.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();
      if (!line) continue;

      let message: A2UIMessage;
      try {
        message = JSON.parse(line) as A2UIMessage;
      } catch (e) {
        parseErrors.push({
          line: i + 1,
          message: e instanceof Error ? e.message : String(e),
        });
        continue;
      }

      messages.push(message);
      try {
        this.parseMessage(message);
      } catch (e) {
        parseErrors.push({
          line: i + 1,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const componentTree = buildComponentTree(this.store.getState());
    return { messages, componentTree, parseErrors };
  }
  
  stringifyJSONL(messages: A2UIMessage[]): string {
    try {
      // 将每个消息转换为JSON字符串，然后用换行符连接
      const lines = messages.map(message => JSON.stringify(message));
      return lines.join('\n');
    } catch (error) {
      // 如果序列化失败，返回空字符串
      console.error('Failed to stringify JSONL:', error);
      return '';
    }
  }
}

export const a2uiParser = new A2UIParser();
export function parseA2UIProtocol(input: string): A2UIMessage[] {
  return a2uiParser.parseJSONL(input);
}

// 处理beginRendering消息
export function handleBeginRendering(message: A2UIMessage): BeginRendering | null {
  if (message.beginRendering) {
    return message.beginRendering;
  }
  return null;
}

// 处理surfaceUpdate消息
export function handleSurfaceUpdate(message: A2UIMessage): SurfaceUpdate | null {
  if (message.surfaceUpdate) {
    return message.surfaceUpdate;
  }
  return null;
}

// 处理dataModelUpdate消息
export function handleDataModelUpdate(message: A2UIMessage): DataModelUpdate | null {
  if (message.dataModelUpdate) {
    return message.dataModelUpdate;
  }
  return null;
}

// 处理deleteSurface消息
export function handleDeleteSurface(message: A2UIMessage): DeleteSurface | null {
  if (message.deleteSurface) {
    return message.deleteSurface;
  }
  return null;
}


