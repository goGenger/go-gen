const prompts = require("prompts");
const fetch = require("node-fetch");
const ora = require("ora");
const chalk = require("chalk");
const { generateTypes } = require("./quicktype");
const { writeFiles } = require("./writer");
const { loadConfig } = require("./config");

// 全局取消控制器
let globalAbortController = null;

/**
 * 增强版 fetch 函数,支持用户取消
 * @param {string} url
 * @param {object} options
 * @param {number} maxRetries
 * @returns {Promise<any>}
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let attempt = 0;
  let lastError;

  const { timeout = 10000, signal: externalSignal, ...fetchOptions } = options;

  while (attempt < maxRetries) {
    attempt++;

    const controller = new AbortController();
    const { signal } = controller;

    let timeoutId;
    let abortListener;

    try {
      // ========= 外部 abort 透传 =========
      if (externalSignal) {
        if (externalSignal.aborted) {
          throw createAbortError();
        }

        abortListener = () => controller.abort();
        externalSignal.addEventListener("abort", abortListener);
      }

      // ========= timeout =========
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          controller.abort();
        }, timeout);
      }

      const res = await fetch(url, {
        ...fetchOptions,
        signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      // ====== Abort 错误语义统一 ======
      if (err.name === "AbortError") {
        if (externalSignal?.aborted) {
          throw new Error("用户取消了请求");
        }
        throw err;
      }

      lastError = err;

      if (attempt >= maxRetries) {
        throw lastError;
      }
    } finally {
      // ========= 清理资源 =========
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (
        externalSignal &&
        abortListener &&
        typeof externalSignal.removeEventListener === "function"
      ) {
        externalSignal.removeEventListener("abort", abortListener);
      }
    }
  }

  throw lastError;
}

/** 创建 AbortError（兼容测试） */
function createAbortError() {
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
}

/**
 * 监听用户输入,允许按 Ctrl+C 或输入 'cancel' 取消请求
 */
function setupCancelListener(spinner) {
  console.log(chalk.gray("\n💡 提示: 请求过程中可以按 Ctrl+C 取消\n"));

  // 监听 Ctrl+C
  const abortHandler = () => {
    if (globalAbortController) {
      spinner.fail(chalk.yellow("⚠️  用户取消了请求"));
      globalAbortController.abort();
      globalAbortController = null;
    }
  };

  process.on("SIGINT", abortHandler);

  // 返回清理函数
  return () => {
    process.removeListener("SIGINT", abortHandler);
  };
}

async function fetchMode() {
  const config = loadConfig();

  // 第一步:基本信息
  const basicInfo = await prompts([
    {
      type: "text",
      name: "url",
      message: "🌐 请输入 API URL:",
      validate: (v) => {
        try {
          new URL(v);
          return true;
        } catch {
          return "请输入合法 URL";
        }
      },
    },
    {
      type: "select",
      name: "method",
      message: "🔧 请求方法:",
      choices: [
        { title: "GET", value: "GET" },
        { title: "POST", value: "POST" },
        { title: "PUT", value: "PUT" },
        { title: "DELETE", value: "DELETE" },
        { title: "PATCH", value: "PATCH" },
      ],
      initial: 0,
    },
  ]);

  // 检查是否取消
  if (!basicInfo.url) {
    console.log(chalk.yellow("\n✋ 操作已取消"));
    return;
  }

  // 第二步:认证信息
  const authInfo = await prompts([
    {
      type: "select",
      name: "authType",
      message: "🔐 是否需要认证?",
      choices: [
        { title: "不需要", value: "none" },
        { title: "Bearer Token", value: "token" },
        { title: "Cookie", value: "cookie" },
      ],
      initial: 0,
    },
    {
      type: (prev) => (prev === "token" ? "password" : null),
      name: "token",
      message: "🔑 请输入 Bearer Token:",
    },
    {
      type: (prev, values) => (values.authType === "cookie" ? "text" : null),
      name: "cookie",
      message: "🍪 请输入 Cookie:",
    },
  ]);

  // 第三步:是否需要请求体
  let hasRequestBody = false;
  let requestBodyData = null;

  if (["POST", "PUT", "PATCH"].includes(basicInfo.method)) {
    const bodyQuestion = await prompts({
      type: "confirm",
      name: "needBody",
      message: "📦 该接口是否需要请求体?",
      initial: false,
    });

    hasRequestBody = bodyQuestion.needBody;

    // 如果需要请求体,让用户输入示例数据
    if (hasRequestBody) {
      console.log(
        chalk.cyan(
          "\n💡 提示: 请输入请求体的 JSON 示例数据(用于生成 Request 类型)"
        )
      );
      console.log(
        chalk.gray(
          '示例: {"name": "张三", "age": 25, "email": "test@example.com"}'
        )
      );

      const bodyInput = await prompts({
        type: "text",
        name: "data",
        message: "📝 请输入请求体 JSON:",
        initial: '{"name": "string", "id": 0}',
        validate: (v) => {
          try {
            JSON.parse(v);
            return true;
          } catch {
            return "请输入合法的 JSON 格式";
          }
        },
      });

      if (bodyInput.data) {
        requestBodyData = JSON.parse(bodyInput.data);
      }
    }
  }

  // 第四步:类型和方法名
  const naming = await prompts([
    {
      type: "text",
      name: "typeName",
      message: "📄 Response Type 名称:",
      initial: "ApiResponse",
    },
    {
      type: "text",
      name: "apiName",
      message: "📦 API 方法名:",
      initial: "getData",
    },
  ]);

  if (!naming.typeName) {
    console.log(chalk.yellow("\n✋ 操作已取消"));
    return;
  }

  // 合并所有响应
  const response = {
    ...basicInfo,
    ...authInfo,
    ...naming,
    hasRequestBody,
  };

  // 🆕 创建全局 AbortController
  globalAbortController = new AbortController();

  const fetchSpinner = ora("🚀 请求 API 数据中...").start();

  // 🆕 设置取消监听器
  const cleanup = setupCancelListener(fetchSpinner);

  try {
    const headers = {
      "Content-Type": "application/json",
    };
    if (response.token) headers.Authorization = `Bearer ${response.token}`;
    if (response.cookie) headers.Cookie = response.cookie;

    const fetchOptions = {
      method: response.method,
      headers,
      timeout: config.timeout || 10000,
    };

    // 如果有请求体数据,添加到请求中
    if (hasRequestBody && requestBodyData) {
      fetchOptions.body = JSON.stringify(requestBodyData);
    }

    const json = await fetchWithRetry(
      response.url,
      fetchOptions,
      config.maxRetries || 3
    );

    fetchSpinner.succeed("✅ API 数据获取完成");

    // 生成 Response 类型
    const typeSpinner = ora("🧠 生成 TypeScript 类型...").start();
    const typesContent = await generateTypes(json, response.typeName);
    typeSpinner.succeed("✅ Response 类型生成完成");

    // 如果需要请求体,生成 Request 类型
    let finalTypesContent = typesContent;
    if (hasRequestBody && requestBodyData) {
      const requestSpinner = ora("🧠 生成 Request 类型...").start();
      const requestTypeName = `${response.typeName}Request`;
      const requestTypes = await generateTypes(
        requestBodyData,
        requestTypeName
      );

      // 合并 Response 和 Request 类型
      finalTypesContent = typesContent + "\n\n" + requestTypes;
      requestSpinner.succeed("✅ Request 类型生成完成");
    }

    const result = await writeFiles({
      apiName: response.apiName,
      typeName: response.typeName,
      url: response.url,
      typesContent: finalTypesContent,
      method: response.method,
      hasRequestBody,
    });

    return result;
  } catch (error) {
    // 区分用户取消和真实错误
    if (error.message === "用户取消了请求") {
      fetchSpinner.fail(chalk.yellow("⚠️  请求已被取消"));
      console.log(chalk.gray("\n提示: 您可以重新开始或退出"));
    } else {
      fetchSpinner.fail(`❌ 请求失败: ${error.message}`);

      if (config.autoRetry) {
        const retry = await prompts({
          type: "confirm",
          name: "value",
          message: "🔄 是否重新开始?",
          initial: true,
        });

        if (retry.value) {
          return fetchMode();
        }
      }

      console.log(chalk.red("\n💡 提示: 请检查网络连接和 URL 是否正确"));
    }

    throw error;
  } finally {
    // 🆕 清理监听器和 AbortController
    cleanup();
    globalAbortController = null;
  }
}

module.exports = fetchMode;
module.exports.fetchWithRetry = fetchWithRetry;
