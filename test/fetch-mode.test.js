const fetchMode = require('../core/fetch-mode');
const { fetchWithRetry } = require('../core/fetch-mode');

jest.mock('node-fetch', () => jest.fn());
jest.mock('prompts');
jest.mock('../core/quicktype');
jest.mock('../core/writer');
jest.mock('../core/config');
jest.mock('ora', () => () => ({
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn(),
  fail: jest.fn(),
}));

const fetch = require('node-fetch');
const prompts = require('prompts');
const { generateTypes } = require('../core/quicktype');
const { writeFiles } = require('../core/writer');
const { loadConfig } = require('../core/config');

describe('fetchWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('请求成功时直接返回 json', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await fetchWithRetry('http://test.com');

    expect(result).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('请求失败后重试成功', async () => {
    fetch
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

    const result = await fetchWithRetry('http://test.com', {}, 2);

    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('超过最大重试次数后抛出错误', async () => {
    fetch.mockRejectedValue(new Error('fail'));

    await expect(
      fetchWithRetry('http://test.com', {}, 2)
    ).rejects.toThrow('fail');

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('fetchMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    loadConfig.mockReturnValue({
      timeout: 10000,
      maxRetries: 1,
      autoRetry: false,
    });
  });

  it('完整成功流程（包含 Request + Response 类型）', async () => {
    // prompts 顺序 mock（非常关键）
    prompts
      .mockResolvedValueOnce({
        url: 'http://api.test.com',
        method: 'POST',
      })
      .mockResolvedValueOnce({
        authType: 'none',
      })
      .mockResolvedValueOnce({
        needBody: true,
      })
      .mockResolvedValueOnce({
        data: '{"name":"test"}',
      })
      .mockResolvedValueOnce({
        typeName: 'ApiResponse',
        apiName: 'getData',
      });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 0, data: { id: 1 } }),
    });

    generateTypes
      .mockResolvedValueOnce('export interface ApiResponse {}')
      .mockResolvedValueOnce('export interface ApiResponseRequest {}');

    writeFiles.mockResolvedValue({ success: true });

    const result = await fetchMode();

    expect(fetch).toHaveBeenCalled();
    expect(generateTypes).toHaveBeenCalledTimes(2);
    expect(writeFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        apiName: 'getData',
        typeName: 'ApiResponse',
        method: 'POST',
        hasRequestBody: true,
      })
    );
    expect(result).toEqual({ success: true });
  });

  it('用户在第一步取消时直接返回', async () => {
    prompts.mockResolvedValueOnce({ url: null });

    const result = await fetchMode();

    expect(result).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('接口请求失败时抛出错误', async () => {
    prompts
      .mockResolvedValueOnce({
        url: 'http://api.test.com',
        method: 'GET',
      })
      .mockResolvedValueOnce({
        authType: 'none',
      })
      .mockResolvedValueOnce({
        typeName: 'ApiResponse',
        apiName: 'getData',
      });

    fetch.mockRejectedValueOnce(new Error('API error'));

    await expect(fetchMode()).rejects.toThrow('API error');
  });
});
