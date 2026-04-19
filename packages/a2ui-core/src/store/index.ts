import { createStore } from 'zustand/vanilla';

export enum ErrorType {
  PARE_ERROR,
  /** 协议中的组件类型在 renderMap 中未注册 */
  RENDERER_NOT_REGISTERED,
}

/** 渲染器未注册类错误附带的结构化字段，便于 UI 展示与排查 */
export interface RendererRegistrationErrorDetails {
  surfaceId: string;
  componentId: string;
  /** 协议 component 对象的类型键，如 Text、Row */
  componentType: string;
  /** beginRendering 中的 catalogId，未开始时可能为空 */
  catalogId?: string;
}

export interface Error {
  type: ErrorType;
  content: string;
  details?: RendererRegistrationErrorDetails;
}

export interface HydrateNode {
  componentId: string;
  _vnode: any; // ReactElement
  ownerSurfaceId: string;
  protocal: string; // JSONL协议
  /**
   * 流式场景下由 parser 在首次加入 hydrateNodeMap 时置为 false（标记）；UI 在完成 0.3s 淡出后通过
   * setHydrateHasMounted 置为 true（清除标记）。undefined 视为历史数据、无需过渡。
   */
  hydrateHasMounted?: boolean;
}

export interface Surface {
  surfaceId: string;
  beginrender: boolean;
  rootNode: HydrateNode;
  /** beginRendering.catalogId，用于错误信息中与协议目录对齐 */
  catalogId?: string;
}

export type RenderFunction = (props: any) => any;
export type RenderMap = Record<string, RenderFunction>;

/** 挂载在 store 上供 parser 读取；避免 store 与 parser 之间相互 import。message/result 形状与 parser 导出的协议类型一致 */
export interface ParseLifecycleHooks {
  /** 每条消息被 parseMessage 成功处理后同步调用（抛错时不会调用） */
  onAfterParseMessage?: (message: unknown, result: unknown) => void;
}

export interface A2uiStore {
  surfaceMap: Record<string, Surface>;
  hydrateNodeMap: Record<string, HydrateNode>;
  errorMap: Record<string, Error>;
  renderMap: RenderMap;
  dataModel: Record<string, any>;
  /** 可选：解析生命周期钩子（由 init 第二参数或 setParseLifecycleHooks 设置） */
  parseLifecycleHooks: ParseLifecycleHooks | null;
  
  // Surface操作
  addSurface: (surface: Surface) => void;
  updateSurface: (surfaceId: string, updates: Partial<Surface>) => void;
  removeSurface: (surfaceId: string) => void;
  getSurface: (surfaceId: string) => Surface | undefined;
  
  // HydrateNode操作
  addHydrateNode: (node: HydrateNode) => void;
  updateHydrateNode: (componentId: string, updates: Partial<HydrateNode>) => void;
  /** 供 UI 在流式淡出动画结束后将对应节点的 hydrateHasMounted 置为 true */
  setHydrateHasMounted: (componentId: string, value: boolean) => void;
  removeHydrateNode: (componentId: string) => void;
  getHydrateNode: (componentId: string) => HydrateNode | undefined;
  
  // Error操作
  addError: (id: string, error: Error) => void;
  removeError: (id: string) => void;
  getError: (id: string) => Error | undefined;
  
  // RenderMap操作
  setRenderMap: (renderMap: RenderMap) => void;

  setParseLifecycleHooks: (hooks: ParseLifecycleHooks | null) => void;

  // DataModel操作
  getDataModel: (surfaceId: string) => any;
  updateDataModel: (surfaceId: string, path: string, data: any) => void;
}

export const createA2uiStore = () => {
  return createStore<A2uiStore>((set, get) => ({
    surfaceMap: {},
    hydrateNodeMap: {},
    errorMap: {},
    renderMap: {},
    dataModel: {},
    parseLifecycleHooks: null,
    
    // Surface操作
    addSurface: (surface) => {
      set((state) => ({
        surfaceMap: {
          ...state.surfaceMap,
          [surface.surfaceId]: surface,
        },
      }));
    },
    
    updateSurface: (surfaceId, updates) => {
      set((state) => {
        const surface = state.surfaceMap[surfaceId];
        if (!surface) return state;
        
        return {
          surfaceMap: {
            ...state.surfaceMap,
            [surfaceId]: {
              ...surface,
              ...updates,
            },
          },
        };
      });
    },
    
    removeSurface: (surfaceId) => {
      set((state) => {
        const newSurfaceMap = { ...state.surfaceMap };
        delete newSurfaceMap[surfaceId];
        return {
          surfaceMap: newSurfaceMap,
        };
      });
    },
    
    getSurface: (surfaceId) => {
      return get().surfaceMap[surfaceId];
    },
    
    // HydrateNode操作
    addHydrateNode: (node) => {
      set((state) => ({
        hydrateNodeMap: {
          ...state.hydrateNodeMap,
          [node.componentId]: node,
        },
      }));
    },
    
    updateHydrateNode: (componentId, updates) => {
      set((state) => {
        const node = state.hydrateNodeMap[componentId];
        if (!node) return state;

        return {
          hydrateNodeMap: {
            ...state.hydrateNodeMap,
            [componentId]: {
              ...node,
              ...updates,
            },
          },
        };
      });
    },

    setHydrateHasMounted: (componentId, value) => {
      const node = get().hydrateNodeMap[componentId];
      if (!node) return;
      get().updateHydrateNode(componentId, { hydrateHasMounted: value });
    },

    removeHydrateNode: (componentId) => {
      set((state) => {
        const newHydrateNodeMap = { ...state.hydrateNodeMap };
        delete newHydrateNodeMap[componentId];
        return {
          hydrateNodeMap: newHydrateNodeMap,
        };
      });
    },
    
    getHydrateNode: (componentId) => {
      return get().hydrateNodeMap[componentId];
    },
    
    // Error操作
    addError: (id, error) => {
      set((state) => ({
        errorMap: {
          ...state.errorMap,
          [id]: error,
        },
      }));
    },
    
    removeError: (id) => {
      set((state) => {
        const newErrorMap = { ...state.errorMap };
        delete newErrorMap[id];
        return {
          errorMap: newErrorMap,
        };
      });
    },
    
    getError: (id) => {
      return get().errorMap[id];
    },
    
    // RenderMap操作
    setRenderMap: (renderMap) => {
      set((state) => ({
        renderMap,
      }));
    },

    setParseLifecycleHooks: (hooks) => {
      set({ parseLifecycleHooks: hooks });
    },

    // DataModel操作
    getDataModel: (surfaceId) => {
      return get().dataModel[surfaceId] || {};
    },
    
    updateDataModel: (surfaceId, path, data) => {
      set((state) => {
        const newDataModel = { ...state.dataModel };
        if (!newDataModel[surfaceId]) {
          newDataModel[surfaceId] = {};
        }
        
        // 简单的路径处理
        if (path === '/' || !path) {
          newDataModel[surfaceId] = data;
        } else {
          const pathParts = path.split('/').filter(Boolean);
          let current = newDataModel[surfaceId];
          
          for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }
          
          current[pathParts[pathParts.length - 1]] = data;
        }
        
        return {
          dataModel: newDataModel,
        };
      });
    },
  }));
};

export const a2uiStore = createA2uiStore();

// 初始化store的方法
export const init = (
  renderMap?: Record<string, any>,
  lifecycle?: ParseLifecycleHooks | null
) => {
  const store = createA2uiStore();

  if (renderMap) {
    store.getState().setRenderMap(renderMap);
  }
  if (lifecycle) {
    store.getState().setParseLifecycleHooks(lifecycle);
  }

  return store;
};
