jest.mock('node-fetch', () => jest.fn());
jest.mock('prompts', () => jest.fn());
jest.mock('ora', () => () => ({
  start: () => ({
    succeed: jest.fn(),
    fail: jest.fn(),
  }),
}));
jest.mock('chalk', () => ({
  yellow: s => s,
  red: s => s,
  gray: s => s,
  cyan: s => s,
}));
jest.mock('../core/quicktype', () => ({
  generateTypes: jest.fn().mockResolvedValue('type ApiResponse = {}'),
}));
jest.mock('../core/writer', () => ({
  writeFiles: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('../core/config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    timeout: 1000,
    maxRetries: 2,
    autoRetry: false,
  }),
}));

const fetch = require('node-fetch');
const prompts = require('prompts');
const fetchMode = require('../core/fetch-mode');
const { fetchWithRetry } = fetchMode;

describe('fetchWithRetry', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('请求成功时直接返回 json', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const res = await fetchWithRetry('http://test.com');
    expect(res).toEqual({ ok: true });
  });

  test('请求失败后重试成功', async () => {
    jest.useFakeTimers();
    fetch
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

    const promise = fetchWithRetry('http://test.com', {}, 2);

    await Promise.resolve();
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    const res = await promise;
    expect(res.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  test('超过最大重试次数后抛出错误', async () => {
    jest.useFakeTimers();
    fetch
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'));

    const promise = fetchWithRetry('http://test.com', {}, 2);

    await Promise.resolve();
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    await expect(promise).rejects.toThrow('network error');
    jest.useRealTimers();
  });

  test('HTTP 非 2xx 时抛出错误', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchWithRetry('http://test.com', {}, 1)).rejects.toThrow(
      'HTTP 500',
    );
  });

  test('timeout 会触发 AbortController.abort()', async () => {
    jest.useFakeTimers();

    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

    fetch.mockImplementation(() => new Promise(() => {}));

    fetchWithRetry('http://test.com', { timeout: 500 }, 1);
    jest.advanceTimersByTime(500);

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });

  test('abort 时抛出用户取消错误', async () => {
    const controller = new AbortController();

    fetch.mockImplementation(() => {
      return new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          const err = new Error('AbortError');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const p = fetchWithRetry(
      'http://test.com',
      { signal: controller.signal },
      1,
    );

    controller.abort();

    await expect(p).rejects.toThrow('用户取消了请求');
  });

  // =====================================================
  // 🔥 新增: 竞态条件测试
  // =====================================================
  test('请求完成和取消同时发生时应该正确处理', async () => {
    jest.useFakeTimers();

    const controller = new AbortController();
    let abortCalled = false;

    // 模拟一个 100ms 后完成的请求
    fetch.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            if (controller.signal.aborted) {
              const err = new Error('AbortError');
              err.name = 'AbortError';
              reject(err);
            } else {
              resolve({
                ok: true,
                json: async () => ({ data: 'success' }),
              });
            }
          }, 100);

          controller.signal.addEventListener('abort', () => {
            abortCalled = true;
            clearTimeout(timeoutId);
            const err = new Error('AbortError');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );

    const promise = fetchWithRetry(
      'http://test.com',
      { signal: controller.signal },
      1,
    );

    // 在 90ms 时取消（请求还有 10ms 完成）
    jest.advanceTimersByTime(90);
    controller.abort();

    // 等待可能的完成
    jest.advanceTimersByTime(20);

    // 应该被取消
    await expect(promise).rejects.toThrow('用户取消了请求');
    expect(abortCalled).toBe(true);

    jest.useRealTimers();
  });

  // =====================================================
  // 🔥 新增: 验证 signal 传递
  // =====================================================
  test('应该正确传递 signal 到 fetch', async () => {
    const controller = new AbortController();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await fetchWithRetry('http://test.com', { signal: controller.signal }, 1);

    // 验证 fetch 被调用时传入了 signal
    expect(fetch).toHaveBeenCalledWith(
      'http://test.com',
      expect.objectContaining({
        signal: expect.any(Object),
      }),
    );
  });

  // =====================================================
  // 🔥 新增: 已完成请求不受 abort 影响
  // =====================================================
  test('已完成的请求不受后续 abort 影响', async () => {
    const controller = new AbortController();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'success' }),
    });

    const result = await fetchWithRetry(
      'http://test.com',
      { signal: controller.signal },
      1,
    );

    // 请求已完成，再调用 abort 不应影响结果
    controller.abort();

    expect(result).toEqual({ data: 'success' });
  });

  // =====================================================
  // 🔥 新增: 重试过程中可以取消
  // =====================================================
  test('重试过程中也应该支持取消', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    let attemptCount = 0;

    fetch.mockImplementation(() => {
      attemptCount++;

      if (attemptCount === 1) {
        // 第一次失败
        return Promise.reject(new Error('Network error'));
      } else if (attemptCount === 2) {
        // 第二次被取消
        return new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            const err = new Error('AbortError');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }
    });

    const promise = fetchWithRetry(
      'http://test.com',
      { signal: controller.signal },
      3,
    );

    // 第一次失败后，会进入 2s 的 setTimeout
    // 我们需要 advance timers 来触发它
    await Promise.resolve(); // 让第一个 fetch 失败
    jest.advanceTimersByTime(2000); // 触发重试延迟

    // 现在应该进入了第二次 fetch
    await Promise.resolve(); // 让第二次 fetch 开始

    // 取消
    controller.abort();

    await expect(promise).rejects.toThrow('用户取消了请求');

    // 应该尝试了 2 次（第一次失败，第二次被取消）
    expect(attemptCount).toBeLessThanOrEqual(2);
    jest.useRealTimers();
  });
});

describe('fetchMode 主流程（轻量）', () => {
  let processListeners;

  beforeEach(() => {
    // 保存原始的 process.on 和 process.removeListener
    processListeners = [];
    const originalOn = process.on.bind(process);
    const originalRemove = process.removeListener.bind(process);

    // Mock process.on 来跟踪监听器
    process.on = jest.fn((event, handler) => {
      if (event === 'SIGINT') {
        processListeners.push(handler);
      }
      return originalOn(event, handler);
    });

    // Mock process.removeListener 来验证清理
    process.removeListener = jest.fn((event, handler) => {
      if (event === 'SIGINT') {
        const index = processListeners.indexOf(handler);
        if (index > -1) {
          processListeners.splice(index, 1);
        }
      }
      return originalRemove(event, handler);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // 清理所有 SIGINT 监听器
    processListeners.forEach(handler => {
      process.removeListener('SIGINT', handler);
    });
    processListeners = [];
  });

  test('完整成功流程（GET）', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    prompts
      .mockResolvedValueOnce({ url: 'http://test.com', method: 'GET' })
      .mockResolvedValueOnce({ authType: 'none' })
      .mockResolvedValueOnce({
        apiName: 'getData',
        typeName: 'ApiResponse',
      });

    const res = await fetchMode();
    expect(res).toEqual({ success: true });

    // 🔥 验证 SIGINT 监听器被正确清理
    expect(process.removeListener).toHaveBeenCalledWith(
      'SIGINT',
      expect.any(Function),
    );
  });

  test('用户第一步取消直接退出', async () => {
    prompts.mockResolvedValueOnce({ url: null });
    const res = await fetchMode();
    expect(res).toBeUndefined();
  });

  // =====================================================
  // 🔥 新增: 用户在请求过程中取消
  // =====================================================
  test('用户在请求过程中按 Ctrl+C 应该取消请求', async () => {
    jest.useFakeTimers();
    fetch.mockImplementation(
      (url, options) =>
        new Promise((resolve, reject) => {
          const signal = options.signal;
          const timeoutId = setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ data: 'success' }),
              }),
            10000,
          );
          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              const err = new Error('AbortError');
              err.name = 'AbortError';
              reject(err);
            });
          }
        }),
    );

    prompts
      .mockResolvedValueOnce({ url: 'http://test.com', method: 'GET' })
      .mockResolvedValueOnce({ authType: 'none' })
      .mockResolvedValueOnce({
        apiName: 'getData',
        typeName: 'ApiResponse',
      });

    const promise = fetchMode();

    // 允许 prompts 及其它 microtasks 执行
    for (let i = 0; i < 10; i++) await Promise.resolve();

    // 模拟用户按 Ctrl+C
    if (processListeners.length > 0) {
      processListeners[0](); // 触发 SIGINT 处理器
    }

    // 此时 fetch 可能还在等待，如果使用了 fake timers
    // 我们需要触发 signal 的 abort 事件，这已经在 abortHandler 中做了
    // 但 fetch 的 mock 需要在 microtask queue 中处理那个 reject
    for (let i = 0; i < 10; i++) await Promise.resolve();

    // fetchMode 应该返回 null（用户取消）
    const result = await promise;
    expect(result).toBeNull();

    // 🔥 验证监听器被清理
    expect(process.removeListener).toHaveBeenCalled();
    jest.useRealTimers();
  });

  // =====================================================
  // 🔥 新增: 请求成功完成后 SIGINT 监听器应该被移除
  // =====================================================
  test('请求成功后应该移除 SIGINT 监听器，不影响后续 prompts', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    prompts
      .mockResolvedValueOnce({ url: 'http://test.com', method: 'GET' })
      .mockResolvedValueOnce({ authType: 'none' })
      .mockResolvedValueOnce({
        apiName: 'getData',
        typeName: 'ApiResponse',
      });

    await fetchMode();

    // 🔥 关键验证: 确保 cleanup 被调用
    expect(process.removeListener).toHaveBeenCalledWith(
      'SIGINT',
      expect.any(Function),
    );

    // 🔥 验证所有监听器都被清理
    expect(processListeners.length).toBe(0);
  });

  // =====================================================
  // 🔥 新增: 请求失败后也应该清理监听器
  // =====================================================
  test('请求失败后也应该移除 SIGINT 监听器', async () => {
    jest.useFakeTimers();
    fetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    prompts
      .mockResolvedValueOnce({ url: 'http://test.com', method: 'GET' })
      .mockResolvedValueOnce({ authType: 'none' })
      .mockResolvedValueOnce({
        apiName: 'getData',
        typeName: 'ApiResponse',
      });

    const promise = fetchMode();

    // 允许 prompts 及其它 microtasks 执行
    for (let i = 0; i < 10; i++) await Promise.resolve();

    // 触发所有定时器（包括重试延迟）
    jest.runAllTimers();

    // 再次 flush microtasks 以处理 timer 触发后的 promise
    for (let i = 0; i < 10; i++) await Promise.resolve();

    try {
      await promise;
    } catch (error) {
      // 预期会抛出错误
    }

    // 🔥 即使失败，也应该清理监听器
    expect(process.removeListener).toHaveBeenCalledWith(
      'SIGINT',
      expect.any(Function),
    );
    expect(processListeners.length).toBe(0);
    jest.useRealTimers();
  });

  // =====================================================
  // 🔥 新增: 竞态条件 - 取消和完成同时发生
  // =====================================================
  test('竞态条件: 取消信号发出但请求已完成时不应卡死', async () => {
    jest.useFakeTimers();
    let resolveRequest;
    const requestPromise = new Promise(resolve => {
      resolveRequest = resolve;
    });

    fetch.mockImplementation(() => requestPromise);

    prompts
      .mockResolvedValueOnce({ url: 'http://test.com', method: 'GET' })
      .mockResolvedValueOnce({ authType: 'none' })
      .mockResolvedValueOnce({
        apiName: 'getData',
        typeName: 'ApiResponse',
      });

    const promise = fetchMode();

    // 允许 prompts 及其它 microtasks 执行
    for (let i = 0; i < 10; i++) await Promise.resolve();

    // 同时触发完成和取消
    resolveRequest({
      ok: true,
      json: async () => ({ data: 'success' }),
    });

    if (processListeners.length > 0) {
      processListeners[0](); // 触发 SIGINT
    }

    // 应该能正常完成，不会卡死
    const result = await promise;

    // 结果可能是成功或取消，但不应该 undefined（卡死）
    expect(result).toBeDefined();

    // 🔥 无论如何，监听器都应该被清理
    expect(processListeners.length).toBe(0);
    jest.useRealTimers();
  });
});

// =====================================================
// 🔥 新增: 集成测试（需要真实网络）
// =====================================================
describe('真实网络集成测试 (可选)', () => {
  // 取消所有 mock，使用真实的 node-fetch
  beforeAll(() => {
    jest.unmock('node-fetch');
  });

  afterAll(() => {
    jest.mock('node-fetch', () => jest.fn());
  });

  // 这个测试需要真实网络，可以用 test.skip 跳过
  test.skip('真实 HTTP 请求应该能被取消', async () => {
    const realFetch = require('node-fetch');
    const controller = new AbortController();

    const promise = realFetch('https://httpbin.org/delay/10', {
      signal: controller.signal,
    });

    // 100ms 后取消
    setTimeout(() => {
      controller.abort();
      console.log('✅ 已调用 controller.abort()');
    }, 100);

    await expect(promise).rejects.toThrow();

    try {
      await promise;
    } catch (error) {
      expect(error.name).toBe('AbortError');
      console.log('✅ 请求被成功取消，错误类型:', error.name);
    }
  }, 15000);
});
