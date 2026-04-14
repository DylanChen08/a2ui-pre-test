import React, { useEffect, useState, useRef } from "react";
// 导入真实的init方法和相关功能
import {
  init,
  a2uiParser,
  simpleTextMock,
  type ComponentTreeNode,
} from "a2ui-core";

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
  const [a2uiJson, setA2uiJson] = useState<any>(null);
  const [jsonlPreview, setJsonlPreview] = useState<string>("");
  const [componentTreesPreview, setComponentTreesPreview] = useState<
    ComponentTreeNode[]
  >([]);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 场景列表
  const scenes = [
    { value: "simple-text", label: "Simple Text" },
    { value: "complex-tree", label: "Complex Nested Tree" },
    { value: "row-column", label: "Row and Column Mixed" },
    { value: "card-demo", label: "Card Demo" },
    { value: "data-binding", label: "Data binding" },
    { value: "list-template", label: "List + template" },
    { value: "shopping-cart", label: "Shopping cart list" },
    { value: "local-action", label: "Local action → dataModel" },
    { value: "agent-back", label: "Agent back" }
  ];

  useEffect(() => {
    // 调用init方法创建store实例
    const newStore = init();
    setStore(newStore);

    // 设置store到a2uiParser
    a2uiParser.setStore(newStore);

    const lines: string[] = [];
    if (simpleTextMock.beginRendering) {
      lines.push(JSON.stringify({ beginRendering: simpleTextMock.beginRendering }));
    }
    if (simpleTextMock.surfaceUpdate) {
      lines.push(JSON.stringify({ surfaceUpdate: simpleTextMock.surfaceUpdate }));
    }
    const jsonl = lines.join("\n");
    setJsonlPreview(jsonl);
    const { componentTrees } = a2uiParser.passJSONL(jsonl);
    setComponentTreesPreview(componentTrees);

    // 获取初始状态
    const initialState = newStore.getState();
    setStoreState(initialState);

    // 订阅store的变化
    const unsubscribe = newStore.subscribe(() => {
      setStoreState(newStore.getState());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    
    // 模拟加载场景数据
    setIsLoading(true);
    setTimeout(() => {
      // 这里可以根据选择的场景加载对应的mock数据
      setIsLoading(false);
    }, 500);
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
            overflow: 'auto'
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
            <div style={{ padding: '24px' }}>
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
            overflow: 'auto'
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
            <div style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', color: '#999' }}>
                暂无错误信息
              </div>
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
            overflow: 'auto'
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
            <div style={{ padding: '24px' }}>
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
                  {JSON.stringify(simpleTextMock, null, 2)}
                </pre>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', marginBottom: '8px' }}>下发 JSONL（协议流）</h3>
                <pre style={{ 
                  padding: '16px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '12px'
                }}>
                  {jsonlPreview || "（暂无）"}
                </pre>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', marginBottom: '8px' }}>组件树预览（TreeBuilder）</h3>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>
                  每次 pass JSONL 后由 <code>buildComponentTrees</code> 生成；当前为占位（仅根 HydrateNode，<code>children</code> 为空）。
                </p>
                <pre style={{ 
                  padding: '16px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '220px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '12px'
                }}>
                  {JSON.stringify(componentTreesPreview, null, 2)}
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

