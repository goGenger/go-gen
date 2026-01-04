const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const os = require('os');
const ora = require('ora');
const fs = require('fs');
const { loadConfig } = require('./config');

const desktopPath = path.join(os.homedir(), 'Desktop');
const currentPath = process.cwd();

function generateApiFile({
  apiName,
  typeName,
  url,
  method = 'GET',
  hasRequestBody = false,
}) {
  const config = loadConfig();
  const requestModule = config.requestModule;
  const finalTypeName = typeName.charAt(0).toUpperCase() + typeName.slice(1);
  const methodLower = method.toLowerCase();

  let imports = `import type { ${finalTypeName}`;
  let params = '';
  let requestCall = '';

  if (hasRequestBody) {
    imports += `, ${finalTypeName}Request`;
    params = `data: ${finalTypeName}Request`;
    requestCall = `request.${methodLower}<${finalTypeName}>("${url}", data)`;
  } else {
    requestCall = `request.${methodLower}<${finalTypeName}>("${url}")`;
  }

  imports += ` } from "./types";`;

  return `
import request from "${requestModule}";
${imports}

export function ${apiName}(${params}) {
  return ${requestCall};
}
`.trim();
}

function parseExistingTypes(typesFilePath) {
  if (!fs.existsSync(typesFilePath)) {
    return { types: [], content: '' };
  }

  const content = fs.readFileSync(typesFilePath, 'utf-8');
  const typeRegex = /export\s+(?:interface|type)\s+(\w+)/g;
  const types = [];
  let match;

  while ((match = typeRegex.exec(content)) !== null) {
    types.push(match[1]);
  }

  return { types, content };
}

function parseExistingApis(apiFilePath) {
  if (!fs.existsSync(apiFilePath)) {
    return { functions: [], content: '' };
  }

  const content = fs.readFileSync(apiFilePath, 'utf-8');
  const funcRegex = /export\s+function\s+(\w+)\s*\(/g;
  const functions = [];
  let match;

  while ((match = funcRegex.exec(content)) !== null) {
    functions.push(match[1]);
  }

  return { functions, content };
}

function extractTypeDefinitions(newTypesContent) {
  const lines = newTypesContent.split('\n');
  const definitions = [];
  let currentDef = [];
  let inDefinition = false;
  let braceCount = 0;

  for (const line of lines) {
    if (/export\s+(?:interface|type)\s+\w+/.test(line)) {
      inDefinition = true;
      currentDef = [line];
      braceCount =
        (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

      if (braceCount === 0 && line.includes('=')) {
        definitions.push(currentDef.join('\n'));
        inDefinition = false;
        currentDef = [];
      }
      continue;
    }

    if (inDefinition) {
      currentDef.push(line);
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if (braceCount === 0) {
        definitions.push(currentDef.join('\n'));
        inDefinition = false;
        currentDef = [];
      }
    }
  }

  return definitions;
}

/**
 * 🔥 新增：重命名类型内容中的所有相关类型
 * 当顶层类型重命名时，所有嵌套类型也要重命名
 */
function renameAllRelatedTypes(typesContent, originalTypeName, suffix) {
  if (!suffix) return typesContent;

  // 提取所有类型名
  const typeNamePattern = /export\s+(?:interface|type)\s+(\w+)/g;
  const typeNames = [];
  let match;

  while ((match = typeNamePattern.exec(typesContent)) !== null) {
    typeNames.push(match[1]);
  }

  // 按长度降序排序，避免部分匹配问题
  // 例如：先替换 UserData，再替换 Data
  typeNames.sort((a, b) => b.length - a.length);

  let renamedContent = typesContent;

  // 对每个类型名都添加后缀
  typeNames.forEach(typeName => {
    const newTypeName = `${typeName}${suffix}`;

    // 1. 替换类型定义 (export interface/type)
    renamedContent = renamedContent.replace(
      new RegExp(`(export\\s+(?:interface|type)\\s+)${typeName}\\b`, 'g'),
      `$1${newTypeName}`,
    );

    // 2. 替换类型引用（避免重复替换已经加了后缀的）
    // 使用负向前瞻，确保不会把 Data1 替换成 Data11
    renamedContent = renamedContent.replace(
      new RegExp(`\\b${typeName}\\b(?!${suffix})`, 'g'),
      newTypeName,
    );
  });

  return renamedContent;
}

function resolveTypeNameConflict(existingTypes, typeName) {
  let finalTypeName = typeName;
  let suffix = 0;

  if (!existingTypes.includes(typeName)) {
    return { finalTypeName, hasConflict: false, suffix: 0 };
  }

  // 找到不冲突的名称
  suffix = 1;
  finalTypeName = `${typeName}${suffix}`;

  while (existingTypes.includes(finalTypeName)) {
    suffix++;
    finalTypeName = `${typeName}${suffix}`;
  }

  return { finalTypeName, hasConflict: true, suffix };
}

/**
 * 🔥 修复：合并类型内容时，重命名所有相关类型
 */
function mergeTypesContent(existingContent, newTypesContent, typeName) {
  const typeRegex = /export\s+(?:interface|type)\s+(\w+)/g;
  const existingTypes = [];
  let match;

  while ((match = typeRegex.exec(existingContent)) !== null) {
    existingTypes.push(match[1]);
  }

  const { finalTypeName, hasConflict, suffix } = resolveTypeNameConflict(
    existingTypes,
    typeName,
  );

  let processedContent = newTypesContent;

  // 🔥 如果有冲突，重命名所有相关类型
  if (hasConflict) {
    processedContent = renameAllRelatedTypes(newTypesContent, typeName, suffix);
  }

  const newDefinitions = extractTypeDefinitions(processedContent);

  // 提取新内容中的类型名（已重命名后的）
  const newTypeNames = [];
  newDefinitions.forEach(def => {
    const typeMatch = def.match(/export\s+(?:interface|type)\s+(\w+)/);
    if (typeMatch) {
      newTypeNames.push(typeMatch[1]);
    }
  });

  // 过滤掉已存在的类型
  const uniqueDefinitions = newDefinitions.filter(def => {
    const typeMatch = def.match(/export\s+(?:interface|type)\s+(\w+)/);
    if (!typeMatch) return false;
    return !existingTypes.includes(typeMatch[1]);
  });

  if (uniqueDefinitions.length === 0) {
    return { merged: existingContent, isDuplicate: true, finalTypeName, renamedTypes: [] };
  }

  // 确保有换行分隔
  const merged =
    existingContent.trim() + '\n\n' + uniqueDefinitions.join('\n\n');

  return { 
    merged, 
    isDuplicate: false, 
    finalTypeName, 
    hasConflict,
    renamedTypes: newTypeNames, // 返回所有重命名后的类型名
  };
}

function extractImportedTypes(apiContent) {
  const importMatch = apiContent.match(/import\s+type\s+{\s*([^}]+)\s*}/);
  if (!importMatch) return [];

  return importMatch[1]
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

function mergeApiContent(existingContent, newApiContent, newApiName) {
  const funcRegex = /export\s+function\s+(\w+)\s*\(/g;
  const existingFunctions = [];
  let match;

  while ((match = funcRegex.exec(existingContent)) !== null) {
    existingFunctions.push(match[1]);
  }

  if (existingFunctions.includes(newApiName)) {
    return { merged: existingContent, isDuplicate: true };
  }

  const newTypes = extractImportedTypes(newApiContent);

  const existingImportMatch = existingContent.match(
    /import\s+type\s+{\s*([^}]+)\s*}/,
  );
  const existingTypes = existingImportMatch
    ? existingImportMatch[1]
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    : [];

  const allTypes = [...new Set([...existingTypes, ...newTypes])];

  const newFunctionMatch = newApiContent.match(/(export\s+function[\s\S]+)/);
  const newFunction = newFunctionMatch ? newFunctionMatch[1] : '';

  let merged = existingContent;

  if (allTypes.length > existingTypes.length) {
    const importStatement = `import type { ${allTypes.join(', ')} } from "./types";`;
    merged = merged.replace(
      /import\s+type\s+{[^}]+}\s+from\s+"\.\/types";/,
      importStatement,
    );
  }

  if (newFunction) {
    merged = merged.trim() + '\n\n' + newFunction;
  }

  return { merged, isDuplicate: false };
}

function validatePath(inputPath) {
  const resolved = path.resolve(inputPath);

  // Windows 系统路径（C:\Windows, C:\Program Files 等）
  const windowsDangerousPaths = [
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\System',
  ];

  // Unix/Linux 系统路径
  const unixDangerousPaths = ['/System', '/usr', '/bin', '/sbin', '/etc'];

  // 检查 Windows 路径
  for (const dangerousPath of windowsDangerousPaths) {
    if (resolved.toUpperCase().startsWith(dangerousPath.toUpperCase())) {
      throw new Error('⛔ 不允许写入系统目录');
    }
  }

  // 检查 Unix 路径
  for (const dangerousPath of unixDangerousPaths) {
    if (resolved.startsWith(dangerousPath)) {
      throw new Error('⛔ 不允许写入系统目录');
    }
  }

  return resolved;
}

async function writeFiles({
  apiName,
  typeName,
  url,
  typesContent,
  method = 'GET',
  hasRequestBody = false,
  interactive = true,
}) {
  const config = loadConfig();

  let baseDir;

  if (interactive) {
    const { outputPath } = await inquirer.prompt([
      {
        type: 'list',
        name: 'outputPath',
        message: '📂 输出目录：',
        default: config.defaultOutputPath,
        choices: [
          { name: '💻 桌面', value: desktopPath },
          { name: '📁 当前目录', value: currentPath },
          { name: '🔍 自定义路径', value: 'custom' },
        ],
      },
    ]);

    baseDir = outputPath;
    if (outputPath === 'custom') {
      const { customPath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customPath',
          message: '📁 请输入保存路径：',
          default: config.customPath || currentPath,
          validate: input => {
            try {
              validatePath(input);
              return shell.test('-d', input) || '路径不存在';
            } catch (error) {
              return error.message;
            }
          },
        },
      ]);
      baseDir = customPath;
    }
  } else {
    baseDir = currentPath;
  }

  const outputDir = path.join(baseDir, apiName);
  const dirExists = fs.existsSync(outputDir);

  if (dirExists && interactive) {
    console.log(chalk.yellow(`\n📁 目录已存在，将进行增量写入: ${outputDir}`));
  }

  shell.mkdir('-p', outputDir);

  const typesFilePath = path.join(outputDir, 'types.ts');
  const apiFilePath = path.join(outputDir, 'api.ts');

  let finalTypesContent = typesContent;
  let finalTypeName = typeName;
  let typeSkipped = false;
  let typeConflict = false;
  let renamedTypes = [];

  if (fs.existsSync(typesFilePath)) {
    const existingTypes = fs.readFileSync(typesFilePath, 'utf-8');
    const {
      merged,
      isDuplicate,
      finalTypeName: resolvedName,
      hasConflict,
      renamedTypes: types,
    } = mergeTypesContent(existingTypes, typesContent, typeName);

    if (hasConflict && interactive) {
      console.log(
        chalk.yellow(
          `\n⚠️  检测到类型名冲突，已自动重命名所有相关类型:`,
        ),
      );
      console.log(chalk.gray(`   ${typeName} → ${resolvedName}`));
      if (types && types.length > 0) {
        console.log(chalk.gray(`   包含类型: ${types.join(', ')}`));
      }
      typeConflict = true;
      finalTypeName = resolvedName;
      renamedTypes = types;
    }

    if (isDuplicate && !hasConflict && interactive) {
      console.log(chalk.yellow(`⚠️  类型 ${typeName} 已存在，跳过写入`));
      typeSkipped = true;
    }

    finalTypesContent = merged;
  }

  fs.writeFileSync(typesFilePath, finalTypesContent);

  const newApiContent = generateApiFile({
    apiName,
    typeName: finalTypeName,
    url,
    method,
    hasRequestBody,
  });
  let finalApiContent = newApiContent;
  let apiSkipped = false;

  if (fs.existsSync(apiFilePath)) {
    const existingApi = fs.readFileSync(apiFilePath, 'utf-8');
    const { merged, isDuplicate } = mergeApiContent(
      existingApi,
      newApiContent,
      apiName,
    );

    if (isDuplicate && interactive) {
      console.log(chalk.yellow(`⚠️  API 函数 ${apiName} 已存在，跳过写入`));
      apiSkipped = true;
    }

    finalApiContent = merged;
  }

  fs.writeFileSync(apiFilePath, finalApiContent);

  if (interactive) {
    const spinner = ora();
    spinner.text = chalk.cyan('📂 输出目录：') + outputDir;

    if (typeSkipped && apiSkipped) {
      spinner.warn('⚠️  内容已存在，无新增内容');
    } else if (typeConflict) {
      spinner.succeed(`✨ 生成成功！（类型已重命名为 ${finalTypeName}，包含所有嵌套类型）`);
    } else if (dirExists) {
      spinner.succeed('✨ 增量写入成功！');
    } else {
      spinner.succeed('🎉 文件生成成功！');
    }
  }

  return { success: true, outputDir, finalTypeName, renamedTypes };
}

module.exports = {
  writeFiles,
  generateApiFile,
  parseExistingTypes,
  parseExistingApis,
  mergeTypesContent,
  mergeApiContent,
  resolveTypeNameConflict,
  validatePath,
  renameAllRelatedTypes, // 🔥 导出供测试使用
};