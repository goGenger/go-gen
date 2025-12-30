# 🚀 go-gen

[![npm version](https://badge.fury.io/js/go-gen.svg)](https://www.npmjs.com/package/go-gen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/go-gen.svg)](https://nodejs.org)

一款 TypeScript API 代码生成器，支持从 API 响应或 OpenAPI 文档一键生成 TypeScript 接口代码和类型定义。

[English](./README.en.md) | 简体中文

## ✨ 特性

- 🎯 **Fetch 模式** - 直接请求 API，自动生成类型定义
- 📄 **OpenAPI 模式** - 从 Swagger/OpenAPI 文档批量生成
- 🔄 **增量写入** - 智能合并已存在的文件，避免覆盖
- 🔀 **冲突处理** - 自动检测并重命名重复的类型
- 🌐 **多种 HTTP 方法** - 支持 GET、POST、PUT、DELETE、PATCH
- 🔐 **认证支持** - Bearer Token、Cookie 等多种认证方式
- ⚙️ **双层配置** - 全局配置 + 项目配置，灵活适配多项目

## 📦 安装

### 全局安装（推荐）

```bash
npm install -g go-gen
```

### 项目内安装

```bash
npm install --save-dev go-gen
```

## 🎯 快速开始

### Fetch 模式 - 直接请求 API

```bash
go-gen fetch
```

跟随交互式提示输入 API 信息，即可生成代码：

**生成的 types.ts**

```typescript
export interface UserResponse {
  id: number;
  name: string;
  email: string;
}
```

**生成的 api.ts**

```typescript
import request from '@/utils/request';
import type { UserResponse } from './types';

export function getUsers() {
  return request.get<UserResponse>('https://api.example.com/users');
}
```

### OpenAPI 模式 - 从文档生成

```bash
# 本地文件
go-gen openapi ./swagger.json

# 远程 URL
go-gen openapi https://api.example.com/swagger.json
```

支持批量生成和逐个生成两种模式。

## 📚 文档

- [完整特性文档](./docs/FEATURES.md) - 详细功能说明
- [配置指南](./docs/CONFIGURATION.md) - 配置系统详解
- [使用场景](./docs/USE_CASES.md) - 实际应用案例
- [最佳实践](./docs/BEST_PRACTICES.md) - 团队协作建议
- [故障排查](./docs/TROUBLESHOOTING.md) - 常见问题解决

## 📝 主要命令

```bash
# Fetch 模式
go-gen fetch

# OpenAPI 模式
go-gen openapi <source>

# 初始化项目配置
go-gen init

# 配置管理
go-gen config --show          # 查看配置
go-gen config --global        # 设置全局配置

# 查看帮助
go-gen --help
go-gen --version
```

## ⚙️ 快速配置

```bash
# 初始化项目配置
go-gen init

# 设置全局配置
go-gen config --global
```

配置优先级：项目配置 > 全局配置 > 默认配置

详见 [配置指南](./docs/CONFIGURATION.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

查看 [贡献指南](./CONTRIBUTING.md) 了解如何参与项目开发。

## 🧪 测试

```bash
# 运行所有测试
npm test

# 查看覆盖率
npm test -- --coverage
```

## 📄 License

[MIT](./LICENSE)

## 📮 联系方式

- GitHub: [@goGenger](https://github.com/goGenger)
- Email: bg2582266166@gmail.com
- Issues: [GitHub Issues](https://github.com/goGenger/go-gen/issues)

---

**Made with ❤️ by goGenger**

如果这个项目对你有帮助，请给一个 ⭐️ Star！
