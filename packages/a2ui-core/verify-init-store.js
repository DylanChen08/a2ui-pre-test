import { createA2uiStore } from './dist/store/index.js';

// 简单的验证函数
function verifyInitStore() {
  console.log('开始验证createA2uiStore方法...');
  
  // 调用createA2uiStore方法初始化store
  const store = createA2uiStore();
  
  // 验证store的初始状态
  const state = store.getState();
  
  // 验证surfaceMap初始为空对象
  const surfaceMapIsEmpty = Object.keys(state.surfaceMap).length === 0;
  console.log(`surfaceMap初始为空对象: ${surfaceMapIsEmpty}`);
  
  // 验证hydrateNodeMap初始为空对象
  const hydrateNodeMapIsEmpty = Object.keys(state.hydrateNodeMap).length === 0;
  console.log(`hydrateNodeMap初始为空对象: ${hydrateNodeMapIsEmpty}`);
  
  // 验证errorMap初始为空对象
  const errorMapIsEmpty = Object.keys(state.errorMap).length === 0;
  console.log(`errorMap初始为空对象: ${errorMapIsEmpty}`);
  
  // 验证store的方法存在
  const methodsExist = {
    addSurface: typeof state.addSurface === 'function',
    updateSurface: typeof state.updateSurface === 'function',
    removeSurface: typeof state.removeSurface === 'function',
    getSurface: typeof state.getSurface === 'function',
    addHydrateNode: typeof state.addHydrateNode === 'function',
    updateHydrateNode: typeof state.updateHydrateNode === 'function',
    removeHydrateNode: typeof state.removeHydrateNode === 'function',
    getHydrateNode: typeof state.getHydrateNode === 'function',
    addError: typeof state.addError === 'function',
    removeError: typeof state.removeError === 'function',
    getError: typeof state.getError === 'function'
  };
  
  console.log('store方法存在验证:');
  Object.entries(methodsExist).forEach(([method, exists]) => {
    console.log(`  ${method}: ${exists}`);
  });
  
  // 验证每次调用createA2uiStore都返回新实例
  const store1 = createA2uiStore();
  const store2 = createA2uiStore();
  const isDifferentInstance = store1 !== store2;
  console.log(`每次调用createA2uiStore返回新实例: ${isDifferentInstance}`);
  
  // 验证两个store的状态相互独立
  store1.getState().addSurface({
    surfaceId: 'test-1',
    beginrender: false,
    rootNode: {
      componentId: 'test-node-1',
      _vnode: null,
      ownerSurfaceId: 'test-1',
      protocal: '{}'
    }
  });
  
  const store1HasSurface = !!store1.getState().surfaceMap['test-1'];
  const store2HasSurface = !!store2.getState().surfaceMap['test-1'];
  console.log(`store1包含test-1 surface: ${store1HasSurface}`);
  console.log(`store2不包含test-1 surface: ${!store2HasSurface}`);
  
  // 总结验证结果
  const allChecksPassed = surfaceMapIsEmpty && 
                         hydrateNodeMapIsEmpty && 
                         errorMapIsEmpty && 
                         Object.values(methodsExist).every(exists => exists) && 
                         isDifferentInstance && 
                         store1HasSurface && 
                         !store2HasSurface;
  
  console.log(`\n验证结果: ${allChecksPassed ? '通过' : '失败'}`);
  
  return allChecksPassed;
}

// 运行验证
verifyInitStore();
