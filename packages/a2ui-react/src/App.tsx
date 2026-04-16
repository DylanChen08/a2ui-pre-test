import React, { useEffect, useState, useRef, useMemo } from "react";
// 导入真实的init方法和相关功能
import {
  init,
  a2uiParser,
  buildComponentTree,
  type ComponentTree,
} from "a2ui-core";
import simpleTextProtocol from "../../a2ui-core/src/mock/simple-text.json";
import columnThreeTextProtocol from "../../a2ui-core/src/mock/column-three-text.json";
import complexNestedTreeProtocol from "../../a2ui-core/src/mock/complex-nested-tree.json";

type LiteralValue =
  | { literalString?: string; literalNumber?: number; literalBoolean?: boolean; literalArray?: unknown[]; path?: string }
  | undefined
  | null;

function getByPath(source: any, path?: string) {
  if (!path || path === "/") return source;
  const parts = path.split("/").filter(Boolean);
  return parts.reduce((acc, part) => (acc == null ? undefined : acc[part]), source);
}

function protocolToJsonl(protocol: any): string {
  return [
    JSON.stringify({ beginRendering: protocol?.beginRendering ?? {} }),
    JSON.stringify({ surfaceUpdate: protocol?.surfaceUpdate ?? {} }),
  ].join("\n");
}

export function App() {
  const [store, setStore] = useState<any>(null);
  const [storeState, setStoreState] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isModelOnlyMode, setIsModelOnlyMode] = useState<boolean>(false);
  const [selectedScene, setSelectedScene] = useState<string>("simple-text");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showStoreModal, setShowStoreModal] = useState<boolean>(false);
  const [showErrorsModal, setShowErrorsModal] = useState<boolean>(false);
  const [showA2UIModal, setShowA2UIModal] = useState<boolean>(false);
  const [activeTabMap, setActiveTabMap] = useState<Record<string, number>>({});
  const [modalOpenMap, setModalOpenMap] = useState<Record<string, boolean>>({});
  const runtimeStateRef = useRef<any>(null);
  const activeTabMapRef = useRef<Record<string, number>>({});
  const modalOpenMapRef = useRef<Record<string, boolean>>({});

  const sceneProtocolMap = useMemo<Record<string, any>>(
    () => ({
      "simple-text": simpleTextProtocol,
      "row-column": columnThreeTextProtocol,
      "complex-tree": complexNestedTreeProtocol,
    }),
    []
  );
  const selectedProtocol = sceneProtocolMap[selectedScene] ?? simpleTextProtocol;

  useEffect(() => {
    runtimeStateRef.current = storeState;
  }, [storeState]);
  useEffect(() => {
    activeTabMapRef.current = activeTabMap;
  }, [activeTabMap]);
  useEffect(() => {
    modalOpenMapRef.current = modalOpenMap;
  }, [modalOpenMap]);

  const resolveValue = (value: LiteralValue, surfaceId?: string): any => {
    if (!value) return undefined;
    if (value.literalString !== undefined) return value.literalString;
    if (value.literalNumber !== undefined) return value.literalNumber;
    if (value.literalBoolean !== undefined) return value.literalBoolean;
    if (value.literalArray !== undefined) return value.literalArray;
    if (value.path) {
      const model = runtimeStateRef.current?.dataModel?.[surfaceId ?? ""] ?? {};
      return getByPath(model, value.path);
    }
    return undefined;
  };

  const resolveSurfaceIdByComponent = (componentId?: string) =>
    runtimeStateRef.current?.hydrateNodeMap?.[componentId ?? ""]?.ownerSurfaceId as string | undefined;

  const resolveChild = (componentId?: string) =>
    runtimeStateRef.current?.hydrateNodeMap?.[componentId ?? ""]?._vnode ?? null;

  const resolveChildren = (childrenConfig: any) => {
    if (!childrenConfig) return [];
    if (Array.isArray(childrenConfig.explicitList)) {
      return childrenConfig.explicitList
        .map((id: string) => resolveChild(id))
        .filter(Boolean);
    }
    if (childrenConfig.template?.componentId && childrenConfig.template?.dataBinding) {
      const templateId = childrenConfig.template.componentId;
      const ownerSurfaceId = resolveSurfaceIdByComponent(templateId);
      const dataMap = getByPath(
        runtimeStateRef.current?.dataModel?.[ownerSurfaceId ?? ""] ?? {},
        childrenConfig.template.dataBinding
      );
      const keys = dataMap && typeof dataMap === "object" ? Object.keys(dataMap) : [];
      const templateNode = resolveChild(templateId);
      return keys.map((key) =>
        React.isValidElement(templateNode)
          ? React.cloneElement(templateNode as React.ReactElement, { key: `${templateId}-${key}` })
          : templateNode
      );
    }
    return [];
  };

  const renderMap = useMemo(
    () => ({
      Text: (props: any) => {
        const surfaceId = resolveSurfaceIdByComponent(props?.id);
        const content = resolveValue(props?.text, surfaceId) ?? "";
        const usageHint = props?.usageHint ?? "body";
        const styleMap: Record<string, React.CSSProperties> = {
          h1: { fontSize: "32px", fontWeight: 700 },
          h2: { fontSize: "26px", fontWeight: 700 },
          h3: { fontSize: "22px", fontWeight: 700 },
          h4: { fontSize: "18px", fontWeight: 600 },
          h5: { fontSize: "16px", fontWeight: 600 },
          caption: { fontSize: "12px", color: "#666" },
          body: { fontSize: "14px" },
        };
        return <span style={{ display: "inline-block", lineHeight: 1.6, ...(styleMap[usageHint] ?? styleMap.body) }}>{String(content)}</span>;
      },
      Image: (props: any) => {
        const surfaceId = resolveSurfaceIdByComponent(props?.id);
        const src = resolveValue(props?.url, surfaceId) ?? "";
        const sizeMap: Record<string, number> = { icon: 20, avatar: 48, smallFeature: 120, mediumFeature: 220, largeFeature: 320 };
        const base = sizeMap[props?.usageHint] ?? 180;
        return (
          <img
            src={String(src)}
            alt={props?.id ?? "a2ui-image"}
            style={{
              width: props?.usageHint === "header" ? "100%" : base,
              height: props?.usageHint === "header" ? 180 : base,
              objectFit: props?.fit ?? "cover",
              borderRadius: props?.usageHint === "avatar" ? "50%" : 8,
              backgroundColor: "#f2f2f2",
            }}
          />
        );
      },
      Icon: (props: any) => {
        const surfaceId = resolveSurfaceIdByComponent(props?.id);
        const name = resolveValue(props?.name, surfaceId) ?? "help";
        return <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, padding: "2px 6px", border: "1px solid #ddd", borderRadius: 4 }}>{String(name)}</span>;
      },
      Video: (props: any) => {
        const surfaceId = resolveSurfaceIdByComponent(props?.id);
        const src = resolveValue(props?.url, surfaceId) ?? "";
        return <video controls src={String(src)} style={{ width: "100%", maxWidth: 420, borderRadius: 8 }} />;
      },
      AudioPlayer: (props: any) => {
        const surfaceId = resolveSurfaceIdByComponent(props?.id);
        const src = resolveValue(props?.url, surfaceId) ?? "";
        const description = resolveValue(props?.description, surfaceId);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {description ? <span style={{ fontSize: 13 }}>{String(description)}</span> : null}
            <audio controls src={String(src)} />
          </div>
        );
      },
      Row: (props: any) => {
        const children = resolveChildren(props?.children);
        const justifyContentMap: Record<string, React.CSSProperties["justifyContent"]> = {
          start: "flex-start",
          center: "center",
          end: "flex-end",
          spaceBetween: "space-between",
          spaceAround: "space-around",
          spaceEvenly: "space-evenly",
        };
        const alignItemsMap: Record<string, React.CSSProperties["alignItems"]> = {
          start: "flex-start",
          center: "center",
          end: "flex-end",
          stretch: "stretch",
        };
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: justifyContentMap[props?.distribution] ?? "flex-start",
              alignItems: alignItemsMap[props?.alignment] ?? "center",
              gap: 10,
            }}
          >
            {children}
          </div>
        );
      },
      Column: (props: any) => {
        const children = resolveChildren(props?.children);
        const justifyContentMap: Record<string, React.CSSProperties["justifyContent"]> = {
          start: "flex-start",
          center: "center",
          end: "flex-end",
          spaceBetween: "space-between",
          spaceAround: "space-around",
          spaceEvenly: "space-evenly",
        };
        const alignItemsMap: Record<string, React.CSSProperties["alignItems"]> = {
          start: "flex-start",
          center: "center",
          end: "flex-end",
          stretch: "stretch",
        };
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: justifyContentMap[props?.distribution] ?? "flex-start",
              alignItems: alignItemsMap[props?.alignment] ?? "stretch",
              gap: 10,
            }}
          >
            {children}
          </div>
        );
      },
      List: (props: any) => {
        const children = resolveChildren(props?.children);
        const isHorizontal = props?.direction === "horizontal";
        return <div style={{ display: "flex", flexDirection: isHorizontal ? "row" : "column", gap: 10 }}>{children}</div>;
      },
      Card: (props: any) => (
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 10, padding: 12, backgroundColor: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          {resolveChild(props?.child)}
        </div>
      ),
      Tabs: (props: any) => {
        const tabItems = Array.isArray(props?.tabItems) ? props.tabItems : [];
        const activeIdx = activeTabMapRef.current[props?.id] ?? 0;
        const activeItem = tabItems[activeIdx];
        return (
          <div style={{ border: "1px solid #ececec", borderRadius: 8 }}>
            <div style={{ display: "flex", borderBottom: "1px solid #ececec" }}>
              {tabItems.map((tab: any, idx: number) => {
                const surfaceId = resolveSurfaceIdByComponent(props?.id);
                const title = resolveValue(tab?.title, surfaceId) ?? `Tab ${idx + 1}`;
                return (
                  <button
                    key={`${props?.id}-tab-${idx}`}
                    onClick={() => setActiveTabMap((prev) => ({ ...prev, [props?.id]: idx }))}
                    style={{ border: "none", background: idx === activeIdx ? "#f0f7ff" : "transparent", padding: "8px 12px", cursor: "pointer" }}
                  >
                    {String(title)}
                  </button>
                );
              })}
            </div>
            <div style={{ padding: 12 }}>{resolveChild(activeItem?.child)}</div>
          </div>
        );
      },
      Divider: (props: any) =>
        props?.axis === "vertical" ? (
          <div style={{ width: 1, height: 24, backgroundColor: "#ddd" }} />
        ) : (
          <div style={{ width: "100%", height: 1, backgroundColor: "#ddd" }} />
        ),
      Modal: (props: any) => {
        const open = !!modalOpenMapRef.current[props?.id];
        return (
          <div style={{ position: "relative" }}>
            <div onClick={() => setModalOpenMap((prev) => ({ ...prev, [props?.id]: true }))} style={{ display: "inline-block", cursor: "pointer" }}>
              {resolveChild(props?.entryPointChild)}
            </div>
            {open ? (
              <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                <div style={{ background: "#fff", borderRadius: 8, minWidth: 320, maxWidth: 680, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                    <button onClick={() => setModalOpenMap((prev) => ({ ...prev, [props?.id]: false }))}>关闭</button>
                  </div>
                  {resolveChild(props?.contentChild)}
                </div>
              </div>
            ) : null}
          </div>
        );
      },
      Button: (props: any) => (
        <button
          onClick={() => {
            if (!props?.action?.name) return;
            setMessages((prev) => [
              ...prev,
              {
                id: `action-${Date.now()}`,
                type: "assistant",
                content: `触发 action: ${props.action.name}`,
                status: "completed",
              },
            ]);
          }}
          style={{
            border: "none",
            borderRadius: 6,
            padding: "8px 12px",
            cursor: "pointer",
            backgroundColor: props?.primary ? "#1677ff" : "#efefef",
            color: props?.primary ? "#fff" : "#222",
          }}
        >
          {resolveChild(props?.child) ?? "按钮"}
        </button>
      ),
      CheckBox: (props: any) => {
        const surfaceId = resolveSurfaceIdByComponent(props?.id);
        const label = resolveValue(props?.label, surfaceId) ?? "";
        const checked = !!resolveValue(props?.value, surfaceId);
        return (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={checked} readOnly />
            <span>{String(label)}</span>
          </label>
        );
      },
      TextField: (props: any) => {
        const surfaceId = resolveSurfaceIdByComponent(props?.id);
        const label = resolveValue(props?.label, surfaceId) ?? "输入";
        const value = resolveValue(props?.text, surfaceId) ?? "";
        const inputTypeMap: Record<string, string> = {
          date: "date",
          longText: "text",
          number: "number",
          shortText: "text",
          obscured: "password",
        };
        return (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#666" }}>{String(label)}</span>
            <input type={inputTypeMap[props?.textFieldType] ?? "text"} value={String(value)} readOnly style={{ border: "1px solid #d9d9d9", borderRadius: 6, padding: "8px 10px" }} />
          </label>
        );
      },
      DateTimeInput: (props: any) => {
        const surfaceId = resolveSurfaceIdByComponent(props?.id);
        const value = resolveValue(props?.value, surfaceId) ?? "";
        const inputType = props?.enableDate && props?.enableTime ? "datetime-local" : props?.enableDate ? "date" : "time";
        return <input type={inputType} value={String(value)} readOnly style={{ border: "1px solid #d9d9d9", borderRadius: 6, padding: "8px 10px" }} />;
      },
      MultipleChoice: (props: any) => {
        const surfaceId = resolveSurfaceIdByComponent(props?.id);
        const selected = new Set((resolveValue(props?.selections, surfaceId) ?? []) as string[]);
        const options = Array.isArray(props?.options) ? props.options : [];
        const chips = props?.variant === "chips";
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {options.map((opt: any, idx: number) => {
              const label = resolveValue(opt?.label, surfaceId) ?? opt?.value ?? `Option ${idx + 1}`;
              const isActive = selected.has(opt?.value);
              return chips ? (
                <span key={`${props?.id}-chip-${idx}`} style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: isActive ? "#e6f4ff" : "#f2f2f2", border: `1px solid ${isActive ? "#91caff" : "#ddd"}` }}>
                  {String(label)}
                </span>
              ) : (
                <label key={`${props?.id}-checkbox-${idx}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 160 }}>
                  <input type="checkbox" checked={isActive} readOnly />
                  <span>{String(label)}</span>
                </label>
              );
            })}
          </div>
        );
      },
      Slider: (props: any) => {
        const surfaceId = resolveSurfaceIdByComponent(props?.id);
        const value = Number(resolveValue(props?.value, surfaceId) ?? 0);
        return <input type="range" min={props?.minValue ?? 0} max={props?.maxValue ?? 100} value={value} readOnly />;
      },
    }),
    []
  );

  const defaultJsonl = useMemo(() => protocolToJsonl(selectedProtocol), [selectedProtocol]);
  const [jsonlInput, setJsonlInput] = useState<string>("");
  const [componentTreePreview, setComponentTreePreview] = useState<ComponentTree | null>(null);
  const [jsonlParseErrors, setJsonlParseErrors] = useState<Array<{ line: number; message: string }>>(
    []
  );

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const storeRef = useRef<any>(null);

  // 场景列表
  const scenes = [
    { value: "simple-text", label: "Simple Text" },
    { value: "complex-tree", label: "Complex Nested Tree (Deep)" },
    { value: "row-column", label: "Row and Column Mixed" },
    { value: "card-demo", label: "Card Demo" },
    { value: "data-binding", label: "Data binding" },
    { value: "list-template", label: "List + template" },
    { value: "shopping-cart", label: "Shopping cart list" },
    { value: "local-action", label: "Local action → dataModel" },
    { value: "agent-back", label: "Agent back" }
  ];

  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  useEffect(() => {
    // 调用init方法创建store实例
    const newStore = init(renderMap);
    setStore(newStore);
    
    // 设置store到a2uiParser
    a2uiParser.setStore(newStore);
    
    // 解析当前选中场景对应的 mock 数据
    if (selectedProtocol.beginRendering) {
      a2uiParser.parseMessage({ beginRendering: selectedProtocol.beginRendering });
    }
    if (selectedProtocol.surfaceUpdate) {
      a2uiParser.parseMessage({ surfaceUpdate: selectedProtocol.surfaceUpdate });
    }
    
    // 获取初始状态
    const initialState = newStore.getState();
    setStoreState(initialState);
    setComponentTreePreview(buildComponentTree(initialState as any));

    // 订阅store的变化
    const unsubscribe = newStore.subscribe(() => {
      const s = newStore.getState();
      setStoreState(s);
      setComponentTreePreview(buildComponentTree(s as any));
    });

    return () => {
      unsubscribe();
    };
  }, [renderMap, selectedProtocol]);

  const activeSurface = storeState ? (Object.values(storeState.surfaceMap ?? {})[0] as any) : null;
  const previewVNode =
    activeSurface?.rootNode?._vnode ??
    (componentTreePreview as any)?.children?.[0] ??
    null;

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!showA2UIModal) return;
    setJsonlInput((prev) => (prev.trim() === "" ? defaultJsonl : prev));
  }, [showA2UIModal, defaultJsonl]);

  useEffect(() => {
    const hot = (
      import.meta as ImportMeta & {
        hot?: {
          accept: (
            dep: string,
            callback: (nextModule: unknown) => void
          ) => void | (() => void);
        };
      }
    ).hot;
    if (!hot) return;

    const applyProtocolToStore = (protocol: any) => {
      const currentStore = storeRef.current;
      if (!currentStore) return;

      a2uiParser.setStore(currentStore);
      if (protocol?.beginRendering) {
        a2uiParser.parseMessage({ beginRendering: protocol.beginRendering });
      }
      if (protocol?.surfaceUpdate) {
        a2uiParser.parseMessage({ surfaceUpdate: protocol.surfaceUpdate });
      }
    };

    const dispose = hot.accept(
      "../../a2ui-core/src/mock/simple-text.json",
      (nextModule: unknown) => {
        const nextProtocol = (nextModule as any)?.default ?? nextModule;
        applyProtocolToStore(nextProtocol);
      }
    );

    return () => {
      dispose?.();
    };
  }, []);

  const handleApplyJsonl = () => {
    if (!store) return;
    a2uiParser.setStore(store);
    const { parseErrors } = a2uiParser.applyJSONL(jsonlInput);
    setJsonlParseErrors(parseErrors);
  };

  // 处理消息发送
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // 添加用户消息
    const userMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: inputValue
    };
    setMessages(prev => [...prev, userMessage]);
    
    // 清空输入框
    setInputValue("");
    
    // 模拟助手响应
    setIsLoading(true);
    setTimeout(() => {
      const assistantMessage = {
        id: `msg-${Date.now() + 1}`,
        type: 'assistant',
        content: "这是一个模拟的助手响应",
        status: 'completed'
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  // 处理场景选择
  const handleSceneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scene = e.target.value;
    setSelectedScene(scene);
    
    const protocol = sceneProtocolMap[scene] ?? simpleTextProtocol;
    const currentStore = storeRef.current;
    if (!currentStore) return;

    setIsLoading(true);
    a2uiParser.setStore(currentStore);
    if (protocol.beginRendering) {
      a2uiParser.parseMessage({ beginRendering: protocol.beginRendering });
    }
    if (protocol.surfaceUpdate) {
      a2uiParser.parseMessage({ surfaceUpdate: protocol.surfaceUpdate });
    }
    setJsonlInput(protocolToJsonl(protocol));
    setIsLoading(false);
  };

  // 处理本地模拟流
  const handleLocalStream = () => {
    setIsLoading(true);
    setTimeout(() => {
      // 模拟加载本地流数据
      setIsLoading(false);
    }, 500);
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      backgroundColor: '#f5f5f5'
    }}>
      {/* 左侧边栏 */}
      <div style={{ 
        width: '420px', 
        backgroundColor: 'white', 
        borderRight: '1px solid #e8e8e8',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 顶部控制区 */}
        <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid #e8e8e8'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Agent 对话</h2>
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>模式：{isModelOnlyMode ? '仅模型对话' : '标准模式'}</p>
          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '14px', marginRight: '8px' }}>仅模型对话</label>
            <input 
              type="checkbox" 
              checked={isModelOnlyMode} 
              onChange={(e) => setIsModelOnlyMode(e.target.checked)}
            />
          </div>
        </div>

        {/* 场景选择区 */}
        <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid #e8e8e8'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', marginBottom: '8px' }}>本地模拟流 · 场景</h3>
          <select 
            value={selectedScene} 
            onChange={handleSceneChange}
            style={{ 
              width: '100%', 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #d9d9d9'
            }}
          >
            {scenes.map(scene => (
              <option key={scene.value} value={scene.value}>{scene.label}</option>
            ))}
          </select>
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>选择一个场景来模拟 A2UI 协议流</p>
        </div>

        {/* 消息历史区 */}
        <div style={{ 
          flex: 1, 
          padding: '16px', 
          overflowY: 'auto'
        }}>
          {messages.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 0', 
              color: '#999'
            }}>
              暂无消息，开始对话吧！
            </div>
          ) : (
            messages.map(message => (
              <div 
                key={message.id} 
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: message.type === 'user' ? 'row-reverse' : 'row'
                }}
              >
                <div 
                  style={{
                    maxWidth: '80%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: message.type === 'user' ? '#e6f4ff' : '#fafafa',
                    border: message.type === 'user' ? '1px solid #91d5ff' : '1px solid #f0f0f0'
                  }}
                >
                  <div style={{ fontSize: '14px' }}>{message.content}</div>
                  {message.status && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '12px', 
                      color: message.status === 'completed' ? '#52c41a' : '#ff4d4f'
                    }}>
                      {message.status === 'completed' ? '已完成' : '未正常完成'}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div style={{ 
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'row'
            }}>
              <div 
                style={{
                  maxWidth: '80%',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#fafafa',
                  border: '1px solid #f0f0f0'
                }}
              >
                <div style={{ fontSize: '14px' }}>加载中...</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 消息输入区 */}
        <div style={{ 
          padding: '16px', 
          borderTop: '1px solid #e8e8e8'
        }}>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息... (Enter发送，Shift+Enter换行)"
            style={{
              width: '100%',
              minHeight: '60px',
              maxHeight: '120px',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #d9d9d9',
              resize: 'none',
              fontSize: '14px'
            }}
          />
          <div style={{ 
            marginTop: '8px', 
            display: 'flex', 
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleSendMessage}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              发送
            </button>
          </div>
        </div>
      </div>

      {/* 右侧主区域 */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 顶部控制栏 */}
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'white',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '20px' }}>A2UI Playground</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowStoreModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              View Store
            </button>
            <button
              onClick={() => setShowErrorsModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              View Errors
            </button>
            <button
              onClick={() => setShowA2UIModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              View A2UI JSON
            </button>
            <button
              onClick={handleLocalStream}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              本地模拟流
            </button>
          </div>
        </div>

        {/* 预览卡片 */}
        <div style={{ 
          flex: 1, 
          padding: '24px',
          overflowY: 'auto'
        }}>
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            padding: '24px',
            minHeight: '400px'
          }}>
            <div style={{ 
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '16px' }}>预览区域</h2>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                display: 'flex',
                gap: '8px'
              }}>
                <span>模式：{isModelOnlyMode ? '仅模型对话' : 'A2UI 模式'}</span>
                <span>状态：{isLoading ? '加载中' : '就绪'}</span>
              </div>
            </div>
            <div style={{ 
              border: '1px dashed #d9d9d9',
              borderRadius: '4px',
              padding: '40px',
              textAlign: 'center'
            }}>
              {isModelOnlyMode ? (
                <div>
                  <h3 style={{ margin: 0, marginBottom: '8px' }}>仅模型对话模式</h3>
                  <p style={{ color: '#666' }}>在这个模式下，系统会直接调用 /api/chat，不加载 A2UI</p>
                </div>
              ) : (
                <div>
                  <h3 style={{ margin: 0, marginBottom: '8px' }}>A2UI 预览</h3>
                  <p style={{ color: '#666' }}>A2UI 组件将在这里实时渲染</p>
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '16px',
                      border: '1px solid #eaeaea',
                      borderRadius: '6px',
                      backgroundColor: '#fff',
                      textAlign: 'left'
                    }}
                  >
                    {previewVNode ? (
                      <div>{previewVNode as React.ReactNode}</div>
                    ) : (
                      <span style={{ color: '#999', fontSize: '12px' }}>
                        当前 root 节点没有可渲染内容（请检查协议 root 是否命中组件，且 renderMap 已实现对应组件类型）
                      </span>
                    )}
                  </div>
                  {storeState && (
                    <div style={{ 
                      marginTop: '24px',
                      textAlign: 'left'
                    }}>
                      <h4 style={{ margin: 0, marginBottom: '8px' }}>当前 Store 状态</h4>
                      <pre style={{ 
                        padding: '16px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '300px',
                        whiteSpace: 'pre-wrap',
                        fontSize: '12px'
                      }}>
                        {JSON.stringify(storeState, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Store State 模态框 */}
      {showStoreModal && (
        <div style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: '800px',
            maxHeight: '600px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              padding: '16px',
              borderBottom: '1px solid #e8e8e8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Store State</h2>
              <button
                onClick={() => setShowStoreModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {storeState && (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px' }}>组件总数：{storeState.surfaces ? Object.keys(storeState.surfaces).length : 0}</h3>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', marginBottom: '8px' }}>数据模型</h3>
                    <pre style={{ 
                      padding: '16px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '200px',
                      whiteSpace: 'pre-wrap',
                      fontSize: '12px'
                    }}>
                      {JSON.stringify(storeState.dataModel, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', marginBottom: '8px' }}>完整 Store 状态</h3>
                    <pre style={{ 
                      padding: '16px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '300px',
                      whiteSpace: 'pre-wrap',
                      fontSize: '12px'
                    }}>
                      {JSON.stringify(storeState, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Errors 模态框 */}
      {showErrorsModal && (
        <div style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: '600px',
            maxHeight: '600px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              padding: '16px',
              borderBottom: '1px solid #e8e8e8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Errors</h2>
              <button
                onClick={() => setShowErrorsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {storeState && Object.keys(storeState.errorMap ?? {}).length > 0 ? (
                <pre
                  style={{
                    padding: '16px',
                    backgroundColor: '#fff7e6',
                    border: '1px solid #ffd591',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '420px',
                    whiteSpace: 'pre-wrap',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  {JSON.stringify(storeState.errorMap, null, 2)}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', color: '#999' }}>暂无错误信息</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* A2UI JSON 模态框 */}
      {showA2UIModal && (
        <div style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: '800px',
            maxHeight: '600px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              padding: '16px',
              borderBottom: '1px solid #e8e8e8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>A2UI JSON</h2>
              <button
                onClick={() => setShowA2UIModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', marginBottom: '8px' }}>模型返回（完整）</h3>
                <pre style={{ 
                  padding: '16px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '12px'
                }}>
                  {JSON.stringify(selectedProtocol, null, 2)}
                </pre>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', marginBottom: '8px' }}>下发 JSONL（协议流）</h3>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#666' }}>
                  每行一条 JSON 消息；点击「应用」后会依次 parseMessage，并由 TreeBuilder 生成组件树（当前 children 为占位空数组）。
                </p>
                <textarea
                  value={jsonlInput}
                  onChange={(e) => setJsonlInput(e.target.value)}
                  spellCheck={false}
                  style={{
                    width: '100%',
                    minHeight: '140px',
                    boxSizing: 'border-box',
                    padding: '12px',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid #d9d9d9',
                    resize: 'vertical',
                  }}
                />
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleApplyJsonl}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#0070f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    应用 JSONL 并生成组件树
                  </button>
                  <span style={{ fontSize: '12px', color: '#888' }}>结果见下方「组件树预览」</span>
                </div>
                {jsonlParseErrors.length > 0 && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 12px',
                      backgroundColor: '#fff2f0',
                      border: '1px solid #ffccc7',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <strong style={{ color: '#cf1322' }}>解析 / 应用错误</strong>
                    <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                      {jsonlParseErrors.map((err, idx) => (
                        <li key={idx}>
                          第 {err.line} 行：{err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', marginBottom: '8px' }}>组件树预览（TreeBuilder）</h3>
                <pre
                  style={{
                    padding: '16px',
                    backgroundColor: '#f0f7ff',
                    border: '1px solid #d6e4ff',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '220px',
                    whiteSpace: 'pre-wrap',
                    fontSize: '12px',
                  }}
                >
                  {componentTreePreview
                    ? JSON.stringify(componentTreePreview, null, 2)
                    : "暂无组件树（先应用 JSONL 或等待 store 更新）"}
                </pre>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', marginBottom: '8px' }}>当前 store 反推协议</h3>
                <pre style={{ 
                  padding: '16px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '12px'
                }}>
                  {JSON.stringify(storeState, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

