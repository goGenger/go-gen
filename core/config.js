const fs = require('fs');
const path = require('path');
const os = require('os');

const LOCAL_CONFIG_FILE = '.apirc.json';
const GLOBAL_CONFIG_FILE = path.join(os.homedir(), '.apirc.json');

const defaultConfig = {
  defaultOutputPath: 'current',
  timeout: 10000,
  autoRetry: true,
  maxRetries: 3,
  requestModule: '@/utils/request',
  typePrefix: '',
  apiPrefix: '',
  defaultMethod: 'GET',
};

function loadConfig() {
  let config = { ...defaultConfig };

  if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
    try {
      const globalConfig = JSON.parse(
        fs.readFileSync(GLOBAL_CONFIG_FILE, 'utf-8'),
      );
      config = { ...config, ...globalConfig };
    } catch (error) {
      console.warn('⚠️  全局配置文件解析失败');
    }
  }

  const localConfigPath = path.join(process.cwd(), LOCAL_CONFIG_FILE);
  if (fs.existsSync(localConfigPath)) {
    try {
      const localConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf-8'));
      config = { ...config, ...localConfig };
    } catch (error) {
      console.warn('⚠️  项目配置文件解析失败');
    }
  }

  return config;
}

function saveGlobalConfig(config) {
  fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(`✅ 全局配置已保存: ${GLOBAL_CONFIG_FILE}`);
}

function saveLocalConfig(config) {
  const localConfigPath = path.join(process.cwd(), LOCAL_CONFIG_FILE);
  fs.writeFileSync(localConfigPath, JSON.stringify(config, null, 2));
  console.log(`✅ 项目配置已保存: ${localConfigPath}`);
}

async function initLocalConfig() {
  const prompts = require('prompts');
  const chalk = require('chalk');

  const localConfigPath = path.join(process.cwd(), LOCAL_CONFIG_FILE);

  if (fs.existsSync(localConfigPath)) {
    console.log(chalk.yellow('⚠️  项目配置文件已存在: ' + LOCAL_CONFIG_FILE));

    const response = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: '是否覆盖现有配置？',
      initial: false,
    });

    if (!response.overwrite) {
      console.log(chalk.yellow('操作已取消'));
      return false;
    }
  }

  const projectConfig = {
    requestModule: '@/utils/request',
    typePrefix: '',
    apiPrefix: '',
  };

  saveLocalConfig(projectConfig);
  console.log(chalk.green('✅ 项目配置创建成功！'));
  console.log(
    chalk.gray('💡 提示: 可以使用 go-gen config --global 设置全局偏好'),
  );
  return true;
}

function showConfig() {
  const config = loadConfig();

  console.log('\n📋 当前生效的配置:\n');

  const hasLocal = fs.existsSync(path.join(process.cwd(), LOCAL_CONFIG_FILE));
  const hasGlobal = fs.existsSync(GLOBAL_CONFIG_FILE);

  console.log('配置来源:');
  console.log(`  ${hasGlobal ? '✅' : '❌'} 全局配置: ${GLOBAL_CONFIG_FILE}`);
  console.log(
    `  ${hasLocal ? '✅' : '❌'} 项目配置: ${path.join(process.cwd(), LOCAL_CONFIG_FILE)}`,
  );
  console.log('');

  console.log('最终配置:');
  Object.entries(config).forEach(([key, value]) => {
    console.log(`  ${key}: ${JSON.stringify(value)}`);
  });

  console.log('\n💡 提示:');
  console.log('  • 项目配置优先级高于全局配置');
  console.log('  • 使用 go-gen init 创建项目配置');
  console.log('  • 使用 go-gen config --global 设置全局偏好\n');
}

async function configGlobal() {
  const prompts = require('prompts');
  const chalk = require('chalk');

  console.log(chalk.cyan('⚙️ 配置全局设置\n'));

  const currentConfig = loadConfig();

  const response = await prompts([
    {
      type: 'select',
      name: 'defaultOutputPath',
      message: '📂 默认输出路径：',
      choices: [
        { title: '📁 当前目录', value: 'current' },
        { title: '💻 桌面', value: 'desktop' },
        { title: '🔍 每次询问', value: 'ask' },
      ],
      initial: currentConfig.defaultOutputPath === 'desktop' ? 1 : 0,
    },
    {
      type: 'number',
      name: 'timeout',
      message: '⏱️ 请求超时时间（毫秒）：',
      initial: currentConfig.timeout,
    },
    {
      type: 'confirm',
      name: 'autoRetry',
      message: '🔄 失败时自动重试：',
      initial: currentConfig.autoRetry,
    },
    {
      type: prev => (prev ? 'number' : null),
      name: 'maxRetries',
      message: '🔁 最大重试次数：',
      initial: currentConfig.maxRetries,
    },
  ]);

  if (!response.defaultOutputPath) {
    console.log(chalk.yellow('\n✋ 操作已取消'));
    return;
  }

  saveGlobalConfig(response);
  console.log(chalk.green('\n✅ 全局配置已更新！\n'));
}

module.exports = {
  loadConfig,
  saveGlobalConfig,
  saveLocalConfig,
  initLocalConfig,
  showConfig,
  configGlobal,
  defaultConfig,
};
