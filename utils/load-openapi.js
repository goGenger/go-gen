const fs = require('fs');
const fetch = require('node-fetch');

async function loadOpenAPI(source) {
  // 如果是 URL
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI: ${response.statusText}`);
    }
    return await response.json();
  }

  // 如果是本地文件
  if (fs.existsSync(source)) {
    const content = fs.readFileSync(source, 'utf-8');
    return JSON.parse(content);
  }

  throw new Error('Invalid OpenAPI source: must be URL or file path');
}

module.exports = loadOpenAPI;
