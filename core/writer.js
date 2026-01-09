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

/**
 * 🔥 新增：给类型内容添加前缀
 */
function applyTypePrefixToContent(typesContent, prefix) {
  if (!prefix) return typesContent;

  // 提取所有类型名
  const typeNamePattern = /export\s+(?:interface|type)\s+(\w+)/g;
  const typeNames = [];
  let match;

  while ((match = typeNamePattern.exec(typesContent)) !== null) {
    typeNames.push(match[1]);
  }

  // 按长度降序排序，避免部分匹配问题
  typeNames.sort((a, b) => b.length - a.length);

  let result = typesContent;

  // 对每个类型名都添加前缀
  typeNames.forEach(typeName => {
    const newTypeName = prefix + typeName;

    // 1. 替换类型定义
    result = result.replace(
      new RegExp(`(export\\s+(?:interface|type)\\s+)${typeName}\\b`, 'g'),
      `$1${newTypeName}`,
    );

    // 2. 替换类型引用（避免重复添加前缀）
    result = result.replace(
      new RegExp(`(?<!${prefix})\\b${typeName}\\b`, 'g'),
      newTypeName,
    );
  });

  return result;
}

function generateApiFile({
  apiName,
  typeName,
  url,
  method = 'GET',
  hasRequestBody = false,
}) {
  const config = loadConfig();
  const requestModule = config.requestModule || '@/utils/request';

  // 🔥 注意：这里的 typeName 和 apiName 应该已经带前缀了
  // 所以不需要再次添加前缀
  const finalTypeName = typeName.charAt(0).toUpperCase() + typeName.slice(1);
  const methodLower = method.toLowerCase();

  let imports = `import type { ${finalTypeName}`;
  let params = '';
  let requestCall = '';

  if (hasRequestBody) {
    const requestTypeName = `${finalTypeName}Request`;
    imports += `, ${requestTypeName}`;
    params = `data: ${requestTypeName}`;
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

function renameAllRelatedTypes(typesContent, originalTypeName, suffix) {
  if (!suffix) return typesContent;

  const typeNamePattern = /export\s+(?:interface|type)\s+(\w+)/g;
  const typeNames = [];
  let match;

  while ((match = typeNamePattern.exec(typesContent)) !== null) {
    typeNames.push(match[1]);
  }

  typeNames.sort((a, b) => b.length - a.length);

  let renamedContent = typesContent;

  typeNames.forEach(typeName => {
    const newTypeName = `${typeName}${suffix}`;

    renamedContent = renamedContent.replace(
      new RegExp(`(export\\s+(?:interface|type)\\s+)${typeName}\\b`, 'g'),
      `$1${newTypeName}`,
    );

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

  if (hasConflict) {
    processedContent = renameAllRelatedTypes(newTypesContent, typeName, suffix);
  }

  const newDefinitions = extractTypeDefinitions(processedContent);

  const newTypeNames = [];
  newDefinitions.forEach(def => {
    const typeMatch = def.match(/export\s+(?:interface|type)\s+(\w+)/);
    if (typeMatch) {
      newTypeNames.push(typeMatch[1]);
    }
  });

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
    return {
      merged: existingContent,
      isDuplicate: true,
      finalTypeName,
      renamedTypes: [],
    };
  }

  const merged =
    existingContent.trim() + '\n\n' + uniqueDefinitions.join('\n\n');

  return {
    merged,
    isDuplicate: false,
    finalTypeName,
    hasConflict,
    renamedTypes: newTypeNames,
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

  const windowsDangerousPaths = [
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\System',
  ];

  const unixDangerousPaths = ['/System', '/usr', '/bin', '/sbin', '/etc'];

  for (const dangerousPath of windowsDangerousPaths) {
    if (resolved.toUpperCase().startsWith(dangerousPath.toUpperCase())) {
      throw new Error('⛔ 不允许写入系统目录');
    }
  }

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

  // 🔥 获取前缀配置
  const typePrefix = config.typePrefix || '';
  const apiPrefix = config.apiPrefix || '';

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

  // 🔥 先给类型内容添加前缀
  let processedTypesContent = typesContent;
  if (typePrefix) {
    processedTypesContent = applyTypePrefixToContent(typesContent, typePrefix);
  }

  // 🔥 给类型名添加前缀
  const prefixedTypeName =
    typePrefix + typeName.charAt(0).toUpperCase() + typeName.slice(1);

  let finalTypesContent = processedTypesContent;
  let finalTypeName = prefixedTypeName;
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
    } = mergeTypesContent(
      existingTypes,
      processedTypesContent,
      prefixedTypeName,
    );

    if (hasConflict && interactive) {
      console.log(
        chalk.yellow(`\n⚠️  检测到类型名冲突，已自动重命名所有相关类型:`),
      );
      console.log(chalk.gray(`   ${prefixedTypeName} → ${resolvedName}`));
      if (types && types.length > 0) {
        console.log(chalk.gray(`   包含类型: ${types.join(', ')}`));
      }
      typeConflict = true;
      finalTypeName = resolvedName;
      renamedTypes = types;
    }

    if (isDuplicate && !hasConflict && interactive) {
      console.log(
        chalk.yellow(`⚠️  类型 ${prefixedTypeName} 已存在，跳过写入`),
      );
      typeSkipped = true;
    }

    finalTypesContent = merged;
  }

  fs.writeFileSync(typesFilePath, finalTypesContent);

  // 🔥 给 API 名添加前缀
  const prefixedApiName = apiPrefix + apiName;

  const newApiContent = generateApiFile({
    apiName: prefixedApiName, // 🔥 使用带前缀的 API 名
    typeName: finalTypeName, // 🔥 使用处理后的类型名（可能带前缀+冲突后缀）
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
      prefixedApiName, // 🔥 使用带前缀的 API 名检查冲突
    );

    if (isDuplicate && interactive) {
      console.log(
        chalk.yellow(`⚠️  API 函数 ${prefixedApiName} 已存在，跳过写入`),
      );
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
      spinner.succeed(
        `✨ 生成成功！（类型已重命名为 ${finalTypeName}，包含所有嵌套类型）`,
      );
    } else if (dirExists) {
      spinner.succeed('✨ 增量写入成功！');
    } else {
      spinner.succeed('🎉 文件生成成功！');
    }

    // 🔥 如果使用了前缀，提示用户
    if (typePrefix || apiPrefix) {
      console.log(chalk.cyan('\n💡 已应用配置前缀:'));
      if (typePrefix) console.log(chalk.gray(`   类型前缀: ${typePrefix}`));
      if (apiPrefix) console.log(chalk.gray(`   API 前缀: ${apiPrefix}`));
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
  renameAllRelatedTypes,
  applyTypePrefixToContent, // 🔥 导出新函数
};
