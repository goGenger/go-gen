const prompts = require('prompts');
const fetch = require('node-fetch');
const ora = require('ora');
const chalk = require('chalk');
const { generateTypes } = require('./quicktype');
const { writeFiles } = require('./writer');
const { loadConfig } = require('./config');

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);
      
      const response = await fetch(url, { 
        ...options, 
        signal: controller.signal 
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        console.log(chalk.yellow(`⚠️  请求失败 (尝试 ${attempt}/${maxRetries})，2秒后重试...`));
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  throw lastError;
}

async function fetchMode() {
  const config = loadConfig();
  
  // 第一步：基本信息
  const basicInfo = await prompts([
    {
      type: 'text',
      name: 'url',
      message: '🌐 请输入 API URL：',
      validate: (v) => {
        try {
          new URL(v);
          return true;
        } catch {
          return '请输入合法 URL';
        }
      }
    },
    {
      type: 'select',
      name: 'method',
      message: '🔧 请求方法：',
      choices: [
        { title: 'GET', value: 'GET' },
        { title: 'POST', value: 'POST' },
        { title: 'PUT', value: 'PUT' },
        { title: 'DELETE', value: 'DELETE' },
        { title: 'PATCH', value: 'PATCH' }
      ],
      initial: 0
    }
  ]);

  // 检查是否取消
  if (!basicInfo.url) {
    console.log(chalk.yellow('\n✋ 操作已取消'));
    return;
  }

  // 第二步：认证信息
  const authInfo = await prompts([
    {
      type: 'select',
      name: 'authType',
      message: '🔐 是否需要认证？',
      choices: [
        { title: '不需要', value: 'none' },
        { title: 'Bearer Token', value: 'token' },
        { title: 'Cookie', value: 'cookie' }
      ],
      initial: 0
    },
    {
      type: prev => prev === 'token' ? 'password' : null,
      name: 'token',
      message: '🔑 请输入 Bearer Token：'
    },
    {
      type: (prev, values) => values.authType === 'cookie' ? 'text' : null,
      name: 'cookie',
      message: '🍪 请输入 Cookie：'
    }
  ]);

  // 第三步：是否需要请求体
  let hasRequestBody = false;
  let requestBodyData = null;
  
  if (['POST', 'PUT', 'PATCH'].includes(basicInfo.method)) {
    const bodyQuestion = await prompts({
      type: 'confirm',
      name: 'needBody',
      message: '📦 该接口是否需要请求体？',
      initial: false
    });
    
    hasRequestBody = bodyQuestion.needBody;
    
    // 如果需要请求体，让用户输入示例数据
    if (hasRequestBody) {
      console.log(chalk.cyan('\n💡 提示: 请输入请求体的 JSON 示例数据（用于生成 Request 类型）'));
      console.log(chalk.gray('示例: {"name": "张三", "age": 25, "email": "test@example.com"}'));
      
      const bodyInput = await prompts({
        type: 'text',
        name: 'data',
        message: '📝 请输入请求体 JSON：',
        initial: '{"name": "string", "id": 0}',
        validate: (v) => {
          try {
            JSON.parse(v);
            return true;
          } catch {
            return '请输入合法的 JSON 格式';
          }
        }
      });
      
      if (bodyInput.data) {
        requestBodyData = JSON.parse(bodyInput.data);
      }
    }
  }

  // 第四步：类型和方法名
  const naming = await prompts([
    {
      type: 'text',
      name: 'typeName',
      message: '📝 Response Type 名称：',
      initial: 'ApiResponse'
    },
    {
      type: 'text',
      name: 'apiName',
      message: '📦 API 方法名：',
      initial: 'getData'
    }
  ]);

  if (!naming.typeName) {
    console.log(chalk.yellow('\n✋ 操作已取消'));
    return;
  }

  // 合并所有响应
  const response = {
    ...basicInfo,
    ...authInfo,
    ...naming,
    hasRequestBody
  };

  const fetchSpinner = ora('🚀 请求 API 数据中...').start();

  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (response.token) headers.Authorization = `Bearer ${response.token}`;
    if (response.cookie) headers.Cookie = response.cookie;

    const fetchOptions = {
      method: response.method,
      headers,
      timeout: config.timeout || 10000,
    };

    // 如果有请求体数据，添加到请求中
    if (hasRequestBody && requestBodyData) {
      fetchOptions.body = JSON.stringify(requestBodyData);
    }

    const json = await fetchWithRetry(response.url, fetchOptions, config.maxRetries || 3);
    
    fetchSpinner.succeed('✅ API 数据获取完成');

    // 生成 Response 类型
    const typeSpinner = ora('🧠 生成 TypeScript 类型...').start();
    const typesContent = await generateTypes(json, response.typeName);
    typeSpinner.succeed('✅ Response 类型生成完成');

    // 如果需要请求体，生成 Request 类型
    let finalTypesContent = typesContent;
    if (hasRequestBody && requestBodyData) {
      const requestSpinner = ora('🧠 生成 Request 类型...').start();
      const requestTypeName = `${response.typeName}Request`;
      const requestTypes = await generateTypes(requestBodyData, requestTypeName);
      
      // 合并 Response 和 Request 类型
      finalTypesContent = typesContent + '\n\n' + requestTypes;
      requestSpinner.succeed('✅ Request 类型生成完成');
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
    fetchSpinner.fail(`❌ 请求失败: ${error.message}`);
    
    if (config.autoRetry) {
      const retry = await prompts({
        type: 'confirm',
        name: 'value',
        message: '🔄 是否重新开始？',
        initial: true
      });
      
      if (retry.value) {
        return fetchMode();
      }
    }
    
    console.log(chalk.red('\n💡 提示: 请检查网络连接和 URL 是否正确'));
    throw error;
  }
}

module.exports = fetchMode;
module.exports.fetchWithRetry = fetchWithRetry;