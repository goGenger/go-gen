jest.mock("node-fetch", () => jest.fn());
jest.mock("prompts", () => jest.fn());
jest.mock("ora", () => () => ({
  start: () => ({
    succeed: jest.fn(),
    fail: jest.fn(),
  }),
}));
jest.mock("chalk", () => ({
  yellow: (s) => s,
  red: (s) => s,
  gray: (s) => s,
  cyan: (s) => s,
}));
jest.mock("../core/quicktype", () => ({
  generateTypes: jest.fn().mockResolvedValue("type ApiResponse = {}"),
}));
jest.mock("../core/writer", () => ({
  writeFiles: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock("../core/config", () => ({
  loadConfig: jest.fn().mockReturnValue({
    timeout: 1000,
    maxRetries: 2,
    autoRetry: false,
  }),
}));

const fetch = require("node-fetch");
const prompts = require("prompts");
const fetchMode = require("../core/fetch-mode");
const { fetchWithRetry } = fetchMode;

describe("fetchWithRetry", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test("请求成功时直接返回 json", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const res = await fetchWithRetry("http://test.com");
    expect(res).toEqual({ ok: true });
  });

  test("请求失败后重试成功", async () => {
    fetch
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

    const res = await fetchWithRetry("http://test.com", {}, 2);
    expect(res.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("超过最大重试次数后抛出错误", async () => {
    fetch.mockRejectedValue(new Error("network error"));

    await expect(fetchWithRetry("http://test.com", {}, 2)).rejects.toThrow(
      "network error"
    );
  });

  test("HTTP 非 2xx 时抛出错误", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(fetchWithRetry("http://test.com", {}, 1)).rejects.toThrow(
      "HTTP 500"
    );
  });

  test("timeout 会触发 AbortController.abort()", async () => {
    jest.useFakeTimers();

    const abortSpy = jest.spyOn(AbortController.prototype, "abort");

    fetch.mockImplementation(() => new Promise(() => {}));

    fetchWithRetry("http://test.com", { timeout: 500 }, 1);
    jest.advanceTimersByTime(500);

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });

  test("abort 时抛出用户取消错误", async () => {
    const controller = new AbortController();

    fetch.mockImplementation(() => {
      return new Promise((_, reject) => {
        controller.signal.addEventListener("abort", () => {
          const err = new Error("AbortError");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    const p = fetchWithRetry(
      "http://test.com",
      { signal: controller.signal },
      1
    );

    controller.abort();

    await expect(p).rejects.toThrow("用户取消了请求");
  });
});

describe("fetchMode 主流程（轻量）", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("完整成功流程（GET）", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    prompts
      .mockResolvedValueOnce({ url: "http://test.com", method: "GET" })
      .mockResolvedValueOnce({ authType: "none" })
      .mockResolvedValueOnce({
        apiName: "getData",
        typeName: "ApiResponse",
      });

    const res = await fetchMode();
    expect(res).toEqual({ success: true });
  });

  test("用户第一步取消直接退出", async () => {
    prompts.mockResolvedValueOnce({ url: null });
    const res = await fetchMode();
    expect(res).toBeUndefined();
  });
});
