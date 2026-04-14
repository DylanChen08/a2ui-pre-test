import { createA2uiStore } from '../index.js';

// 简单的测试函数
function runTests() {
  console.log('开始测试createA2uiStore方法...');
  
  // 测试1: 验证store初始化成功
  console.log('\n测试1: 验证store初始化成功');
  try {
    const store = createA2uiStore();
    const state = store.getState();
    
    // 验证surfaceMap初始为空对象
    if (Object.keys(state.surfaceMap).length !== 0) {
      throw new Error('surfaceMap should be empty initially');
    }
    
    // 验证hydrateNodeMap初始为空对象
    if (Object.keys(state.hydrateNodeMap).length !== 0) {
      throw new Error('hydrateNodeMap should be empty initially');
    }
    
    // 验证errorMap初始为空对象
    if (Object.keys(state.errorMap).length !== 0) {
      throw new Error('errorMap should be empty initially');
    }
    
    // 验证store的方法存在
    if (typeof store.getState().addSurface !== 'function') {
      throw new Error('addSurface should be a function');
    }
    if (typeof store.getState().updateSurface !== 'function') {
      throw new Error('updateSurface should be a function');
    }
    if (typeof store.getState().removeSurface !== 'function') {
      throw new Error('removeSurface should be a function');
    }
    if (typeof store.getState().getSurface !== 'function') {
      throw new Error('getSurface should be a function');
    }
    
    if (typeof store.getState().addHydrateNode !== 'function') {
      throw new Error('addHydrateNode should be a function');
    }
    if (typeof store.getState().updateHydrateNode !== 'function') {
      throw new Error('updateHydrateNode should be a function');
    }
    if (typeof store.getState().removeHydrateNode !== 'function') {
      throw new Error('removeHydrateNode should be a function');
    }
    if (typeof store.getState().getHydrateNode !== 'function') {
      throw new Error('getHydrateNode should be a function');
    }
    
    if (typeof store.getState().addError !== 'function') {
      throw new Error('addError should be a function');
    }
    if (typeof store.getState().removeError !== 'function') {
      throw new Error('removeError should be a function');
    }
    if (typeof store.getState().getError !== 'function') {
      throw new Error('getError should be a function');
    }
    
    console.log('测试1通过');
  } catch (error) {
    console.error('测试1失败:', (error as Error).message);
    return false;
  }
  
  // 测试2: 验证每次调用createA2uiStore都返回新实例
  console.log('\n测试2: 验证每次调用createA2uiStore都返回新实例');
  try {
    const store1 = createA2uiStore();
    const store2 = createA2uiStore();
    
    // 验证返回的是不同的实例
    if (store1 === store2) {
      throw new Error('store1 and store2 should be different instances');
    }
    
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
    
    if (!store1.getState().surfaceMap['test-1']) {
      throw new Error('store1 should have test-1 surface');
    }
    if (store2.getState().surfaceMap['test-1']) {
      throw new Error('store2 should not have test-1 surface');
    }
    
    console.log('测试2通过');
  } catch (error) {
    console.error('测试2失败:', (error as Error).message);
    return false;
  }
  
  console.log('\n所有测试通过!');
  return true;
}

// 运行测试
if (require.main === module) {
  runTests();
}

export { runTests };
