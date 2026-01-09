#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');

// 导入命令
const fetchMode = require('../core/fetch-mode');
const openapiMode = require('../core/openapi-mode');
const { initLocalConfig, showConfig, configGlobal } = require('../core/config');

// 设置程序信息
program
  .name('go-gen')
  .version(packageJson.version)
  .description('🚀 API 代码生成器');

// fetch 命令
program
  .command('fetch')
  .description('📡 Fetch 模式')
  .action(async () => {
    try {
      console.log(chalk.cyan('🚀 Fetch 模式启动\n'));
      await fetchMode();
    } catch (error) {
      console.error(chalk.red('错误:', error.message));
      process.exit(1);
    }
  });

// openapi 命令
program
  .command('openapi <source>')
  .description('📄 OpenAPI 模式')
  .action(async source => {
    try {
      console.log(chalk.cyan('🚀 OpenAPI 模式启动\n'));
      await openapiMode(source);
    } catch (error) {
      console.error(chalk.red('错误:', error.message));
      process.exit(1);
    }
  });

// init 命令
program
  .command('init')
  .description('⚙️ 初始化项目配置')
  .action(async () => {
    try {
      await initLocalConfig();
    } catch (error) {
      console.error(chalk.red('错误:', error.message));
      process.exit(1);
    }
  });

// config 命令
program
  .command('config')
  .description('🔧 配置管理')
  .option('-s, --show', '显示配置')
  .option('-g, --global', '全局配置')
  .action(async options => {
    try {
      if (options.show) {
        showConfig();
      } else if (options.global) {
        await configGlobal();
      } else {
        showConfig();
      }
    } catch (error) {
      console.error(chalk.red('错误:', error.message));
      process.exit(1);
    }
  });

// 解析命令
program.parse(process.argv);

// 没有参数时显示帮助
if (process.argv.length === 2) {
  program.outputHelp();
}
