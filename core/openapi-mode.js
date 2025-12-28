const ora = require("ora");
const prompts = require("prompts");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const os = require("os");
const loadOpenAPI = require("../utils/load-openapi");
const { schemaToSample } = require("../utils/sampler");
const { generateTypes } = require("./quicktype");
const { generateApiFile } = require("./writer");
const { pascalCase } = require("../utils/name");
const { loadConfig } = require("./config");

async function openapiMode(source) {
  const config = loadConfig();
  
  // ===== 阶段 1：读取 OpenAPI =====
  const loadSpinner = ora("📖 读取 OpenAPI...").start();
  
  let openapi;
  try {
    openapi = await loadOpenAPI(source);
    loadSpinner.succeed("✅ OpenAPI 读取完成");
  } catch (error) {
    loadSpinner.fail(`❌ OpenAPI 读取失败: ${error.message}`);
    console.log(chalk.red('💡 请检查文件路径或 URL 是否正确'));
    process.exit(1);
  }

  // ===== 将所有接口拍平成列表 =====
  const apis = [];

  for (const [url, methods] of Object.entries(openapi.paths || {})) {
    for (const [method, api] of Object.entries(methods)) {
      const schema =
        api.responses?.["200"]?.content?.["application/json"]?.schema;

      if (!schema) continue;

      apis.push({ url, method, api, schema });
    }
  }

  if (apis.length === 0) {
    ora().warn("⚠️  未发现可生成的接口");
    return;
  }

  // ===== 阶段 2：选择生成模式 =====
  const { generateMode } = await prompts({
    type: 'select',
    name: 'generateMode',
    message: `🚀 发现 ${apis.length} 个接口，请选择生成模式：`,
    choices: [
      { title: '📝 逐个生成（可自定义名称）', value: 'manual' },
      { title: '⚡ 批量生成（自动命名）', value: 'batch' },
    ],
  });

  if (!generateMode) {
    console.log(chalk.yellow('\n✋ 操作已取消'));
    return;
  }

  if (generateMode === 'batch') {
    // ===== 批量生成模式 =====
    
    // 🔑 关键：只询问一次输出目录
    const desktopPath = path.join(os.homedir(), "Desktop");
    const currentPath = process.cwd();
    
    const outputPathChoice = await prompts({
      type: 'select',
      name: 'outputPath',
      message: '📂 输出目录（所有接口统一使用）：',
      choices: [
        { title: '💻 桌面', value: desktopPath },
        { title: '📁 当前目录', value: currentPath },
        { title: '🔍 自定义路径', value: 'custom' }
      ],
      initial: config.defaultOutputPath === 'desktop' ? 0 : 1
    });

    if (!outputPathChoice.outputPath) {
      console.log(chalk.yellow('\n✋ 操作已取消'));
      return;
    }

    let baseDir = outputPathChoice.outputPath;
    
    if (baseDir === 'custom') {
      const customPathResponse = await prompts({
        type: 'text',
        name: 'customPath',
        message: '📁 请输入保存路径：',
        initial: currentPath,
        validate: (input) => {
          const resolved = path.resolve(input);
          return fs.existsSync(resolved) || "路径不存在";
        }
      });
      
      if (!customPathResponse.customPath) {
        console.log(chalk.yellow('\n✋ 操作已取消'));
        return;
      }
      
      baseDir = customPathResponse.customPath;
    }
    
    const batchSpinner = ora(`⚡ 批量生成中...`).start();
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < apis.length; i++) {
      const { url, method, api, schema } = apis[i];
      
      batchSpinner.text = `⚡ 生成中 (${i + 1}/${apis.length}): ${method.toUpperCase()} ${url}`;

      try {
        // 1️⃣ schema → sample
        const sample = schemaToSample(schema);

        // 2️⃣ 类型名（自动生成）
        const typeName = pascalCase(method) + pascalCase(url.replace(/\//g, "_")) + "Response";

        // 3️⃣ API 方法名（自动生成）
        const apiName = api.operationId || method.toLowerCase() + pascalCase(url.replace(/\//g, "_"));

        // 4️⃣ 生成类型
        const typesContent = await generateTypes(sample, typeName);

        // 5️⃣ 判断是否需要请求体
        const hasRequestBody = ['post', 'put', 'patch'].includes(method.toLowerCase());

        // 6️⃣ 写入文件（不再询问输出目录）
        const outputDir = path.join(baseDir, apiName);
        fs.mkdirSync(outputDir, { recursive: true });

        // 写入 types.ts
        const typesFilePath = path.join(outputDir, "types.ts");
        fs.writeFileSync(typesFilePath, typesContent);

        // 写入 api.ts
        const apiContent = generateApiFile({
          apiName,
          typeName,
          url,
          method: method.toUpperCase(),
          hasRequestBody,
        });
        
        const apiFilePath = path.join(outputDir, "api.ts");
        fs.writeFileSync(apiFilePath, apiContent);
        
        successCount++;
      } catch (error) {
        failCount++;
        console.log(chalk.yellow(`\n⚠️  跳过 ${method.toUpperCase()} ${url}: ${error.message}`));
      }
    }
    
    batchSpinner.succeed(`✅ 批量生成完成！成功: ${successCount}，失败: ${failCount}`);
    console.log(chalk.green(`成功: ${successCount}，失败: ${failCount}`));
    console.log(chalk.cyan(`📂 输出目录: ${baseDir}\n`));
    
  } else {
    // ===== 逐个生成模式 =====
    const parseSpinner = ora(`🔍 解析接口（共 ${apis.length} 个）...`).start();
    parseSpinner.succeed("✅ 接口解析完成");
    
    // 🔑 关键：询问是否对所有接口使用相同的输出目录
    const { useSameDir } = await prompts({
      type: 'confirm',
      name: 'useSameDir',
      message: '📂 是否对所有接口使用相同的输出目录？',
      initial: true
    });
    
    let baseDir = null;
    
    if (useSameDir) {
      const desktopPath = path.join(os.homedir(), "Desktop");
      const currentPath = process.cwd();
      
      const outputPathChoice = await prompts({
        type: 'select',
        name: 'outputPath',
        message: '📂 选择输出目录：',
        choices: [
          { title: '💻 桌面', value: desktopPath },
          { title: '📁 当前目录', value: currentPath },
          { title: '🔍 自定义路径', value: 'custom' }
        ],
        initial: 1
      });

      baseDir = outputPathChoice.outputPath;
      
      if (baseDir === 'custom') {
        const customPathResponse = await prompts({
          type: 'text',
          name: 'customPath',
          message: '📁 请输入保存路径：',
          initial: currentPath
        });
        
        baseDir = customPathResponse.customPath;
      }
    }
    
    for (let i = 0; i < apis.length; i++) {
      const { url, method, api, schema } = apis[i];

      console.log(chalk.cyan(`\n[${i + 1}/${apis.length}] ${method.toUpperCase()} ${url}`));

      try {
        // 1️⃣ schema → sample
        const sample = schemaToSample(schema);

        // 2️⃣ 类型名
        const typeName = pascalCase(method) + pascalCase(url.replace(/\//g, "_")) + "Response";

        // 3️⃣ API 方法名（支持 operationId）
        const defaultApiName = api.operationId || method.toLowerCase() + pascalCase(url.replace(/\//g, "_"));

        const { apiName } = await prompts({
          type: "text",
          name: "apiName",
          message: `📦 API 方法名：`,
          initial: defaultApiName,
        });

        if (!apiName) {
          console.log(chalk.yellow('跳过此接口'));
          continue;
        }

        // 4️⃣ 生成类型
        const typesContent = await generateTypes(sample, typeName);

        // 5️⃣ 判断是否需要请求体
        const hasRequestBody = ['post', 'put', 'patch'].includes(method.toLowerCase());

        // 6️⃣ 写入文件
        let outputDir;
        
        if (baseDir) {
          // 使用统一的输出目录
          outputDir = path.join(baseDir, apiName);
        } else {
          // 每次询问输出目录
          const outputPathChoice = await prompts({
            type: 'select',
            name: 'outputPath',
            message: '📂 输出目录：',
            choices: [
              { title: '💻 桌面', value: path.join(os.homedir(), "Desktop") },
              { title: '📁 当前目录', value: process.cwd() },
            ],
            initial: 1
          });
          
          outputDir = path.join(outputPathChoice.outputPath, apiName);
        }
        
        fs.mkdirSync(outputDir, { recursive: true });

        // 写入 types.ts
        const typesFilePath = path.join(outputDir, "types.ts");
        fs.writeFileSync(typesFilePath, typesContent);

        // 写入 api.ts
        const apiContent = generateApiFile({
          apiName,
          typeName,
          url,
          method: method.toUpperCase(),
          hasRequestBody,
        });
        
        const apiFilePath = path.join(outputDir, "api.ts");
        fs.writeFileSync(apiFilePath, apiContent);
        
        console.log(chalk.green(`✅ 已生成: ${outputDir}`));
        
      } catch (error) {
        console.log(chalk.red(`❌ 生成失败: ${error.message}`));
        
        const resp = await prompts({
          type: 'confirm',
          name: 'continueGen',
          message: '是否继续生成其他接口？',
          initial: true,
        });
        
        const continueGen = resp && resp.continueGen;
        if (!continueGen) break;
      }
    }
    
    console.log(chalk.green('\n✨ 所有接口处理完成！\n'));
  }
}

module.exports = openapiMode;
