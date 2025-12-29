# 🚀 go-gen

[![npm version](https://badge.fury.io/js/go-gen.svg)](https://www.npmjs.com/package/go-gen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/go-gen.svg)](https://nodejs.org)

一款强大的 TypeScript API 代码生成器，支持从 API 响应或 OpenAPI 文档一键生成 TypeScript 接口代码和类型定义。

[English](./README.en.md) | 简体中文

## ✨ 特性

- 🎯 **Fetch 模式** - 直接请求 API，自动生成类型定义
- 📄 **OpenAPI 模式** - 从 Swagger/OpenAPI 文档批量生成
- 🔄 **增量写入** - 智能合并已存在的文件，避免覆盖
- 🔀 **冲突处理** - 自动检测并重命名重复的类型
- 🌐 **多种 HTTP 方法** - 支持 GET、POST、PUT、DELETE、PATCH
- 🔐 **认证支持** - Bearer Token、Cookie 等多种认证方式
- 🔁 **自动重试** - 网络请求失败自动重试
- ⚙️ **双层配置** - 全局配置 + 项目配置，灵活适配多项目
- ⚡ **批量生成** - OpenAPI 模式支持一键生成所有接口
- 🎨 **类型安全** - 生成完整的 TypeScript 类型定义

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

#### 交互式问答

```
🌐 请输入 API URL: https://api.example.com/users
🔧 请求方法: GET
🔐 是否需要认证? 不需要
📝 Response Type 名称: UserResponse
📦 API 方法名: getUsers
📂 输出目录: 📁 当前目录

🚀 请求 API 数据中...
✅ API 数据获取完成
🧠 生成 TypeScript 类型...
✅ 类型生成完成
🎉 文件生成成功！
```

#### 生成的文件

**types.ts**

```typescript
export interface UserResponse {
  id: number;
  name: string;
  email: string;
}
```

**api.ts**

```typescript
import request from "@/utils/request";
import type { UserResponse } from "./types";

export function getUsers() {
  return request.get<UserResponse>("https://api.example.com/users");
}
```

### OpenAPI 模式 - 从文档生成

```bash
# 本地文件
go-gen openapi ./swagger.json

# 远程 URL
go-gen openapi https://api.example.com/swagger.json
```

支持两种生成模式：

- **批量生成** - 自动命名，一次生成所有接口
- **逐个生成** - 可自定义每个接口的名称

## 📖 核心功能

### 1. 支持多种 HTTP 方法

自动识别 POST、PUT、PATCH 方法需要请求体，并生成对应的 Request 类型：

```typescript
// GET 请求
export function getUser() {
  return request.get<UserResponse>("/api/user");
}

// POST 请求（带请求体）
export function createUser(data: CreateUserRequest) {
  return request.post<UserResponse>("/api/user", data);
}
```

### 2. 请求体类型生成

当选择需要请求体时，可以输入示例 JSON 数据：

```bash
📦 该接口是否需要请求体? Yes

💡 提示: 请输入请求体的 JSON 示例数据
📝 请输入请求体 JSON: {"name": "John", "email": "john@example.com"}

✅ Request 类型生成完成
```

生成的类型：

```typescript
export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface CreateUserResponse {
  id: number;
  message: string;
}
```

### 3. 增量写入

智能检测已存在的文件，自动合并新内容：

```typescript
// 第一次生成
export function getUsers() { ... }

// 第二次生成到同一目录
export function getUsers() { ... }
export function createUser(data: CreateUserRequest) { ... }  // 新增
```

### 4. 类型冲突自动处理

检测到重复类型名时自动重命名：

```
⚠️  类型名冲突，已自动重命名: ApiResponse → ApiResponse1
✨ 生成成功！（类型已重命名为 ApiResponse1）
```

### 5. 认证支持

#### Bearer Token

```bash
🔐 是否需要认证? Bearer Token
🔑 请输入 Bearer Token: ********
```

自动添加请求头：`Authorization: Bearer xxx`

#### Cookie

```bash
🔐 是否需要认证? Cookie
🍪 请输入 Cookie: sessionid=abc123
```

自动添加请求头：`Cookie: sessionid=abc123`

## ⚙️ 配置系统

### 双层配置设计

因为 CLI 工具安装在全局，但会在不同项目中使用：

- **全局配置** (`~/.apirc.json`) - 你的个人习惯
- **项目配置** (`./.apirc.json`) - 项目团队规范

**配置优先级：** 项目配置 > 全局配置 > 默认配置

### 初始化配置

```bash
# 初始化项目配置
go-gen init

# 设置全局配置
go-gen config --global

# 查看当前配置
go-gen config --show
```

### 配置示例

**全局配置** (`~/.apirc.json`) - 个人偏好

```json
{
  "defaultOutputPath": "current",
  "timeout": 15000,
  "autoRetry": true,
  "maxRetries": 5
}
```

**项目配置** (`.apirc.json`) - 团队规范

```json
{
  "requestModule": "@/utils/request",
  "typePrefix": "I",
  "apiPrefix": "api"
}
```

### 配置项说明

| 配置项              | 类型    | 默认值              | 说明                 |
| ------------------- | ------- | ------------------- | -------------------- |
| `defaultOutputPath` | string  | `'current'`         | 默认输出路径         |
| `timeout`           | number  | `10000`             | 请求超时时间（毫秒） |
| `autoRetry`         | boolean | `true`              | 失败是否自动重试     |
| `maxRetries`        | number  | `3`                 | 最大重试次数         |
| `requestModule`     | string  | `'@/utils/request'` | request 模块路径     |
| `typePrefix`        | string  | `''`                | 类型名前缀           |
| `apiPrefix`         | string  | `''`                | API 方法名前缀       |
| `defaultMethod`     | string  | `'GET'`             | 默认 HTTP 方法       |

## 📝 命令列表

### 主要命令

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

## 🎨 使用场景

### 场景 1：快速对接第三方 API

```bash
go-gen fetch
# 输入 API URL
# 30 秒内完成代码生成
```

### 场景 2：从 Swagger 文档批量生成

```bash
go-gen openapi https://petstore.swagger.io/v2/swagger.json
# 选择批量模式
# 一次性生成所有接口
```

### 场景 3：团队协作规范化

```bash
# 项目负责人
cd your-project
go-gen init
# 编辑 .apirc.json 设置团队规范
git add .apirc.json
git commit -m "chore: add api generator config"

# 团队成员
git pull
go-gen fetch  # 自动使用团队配置
```

### 场景 4：多项目维护

```bash
# 项目 A（使用 axios）
cd project-a
cat .apirc.json
# { "requestModule": "axios" }
go-gen fetch

# 项目 B（使用自定义 request）
cd project-b
cat .apirc.json
# { "requestModule": "@/utils/http" }
go-gen fetch
```

## 🔧 高级用法

### 自定义输出路径

```bash
# 输出到桌面
# 选择 "💻 桌面"

# 输出到当前目录
# 选择 "📁 当前目录"

# 自定义路径
# 选择 "🔍 自定义路径"
# 输入: /path/to/output
```

### 批量生成优化

OpenAPI 批量模式特点：

- ✅ 只询问一次输出目录
- ✅ 显示进度 (1/10, 2/10...)
- ✅ 统计成功和失败数量
- ✅ 自动命名（基于 operationId）

```
⚡ 批量生成中... (1/10): GET /users
⚡ 批量生成中... (2/10): POST /users
...
✅ 批量生成完成！成功: 10，失败: 0
```

### 错误处理

#### 自动重试

```
🚀 请求 API 数据中...
⚠️  请求失败 (尝试 1/3)，2秒后重试...
⚠️  请求失败 (尝试 2/3)，2秒后重试...
✅ API 数据获取完成
```

#### 友好提示

```
❌ 请求失败: HTTP 401: Unauthorized
💡 提示: 请检查 Token 是否正确
```

## 🎓 最佳实践

### 1. 团队规范化

```json
// .apirc.json
{
  "requestModule": "@/api/request",
  "typePrefix": "I",
  "apiPrefix": "api"
}
```

提交到 Git，团队成员自动使用统一配置。

### 2. 命名规范

**类型名：** `PascalCase` + `Response` 后缀

```typescript
✅ UserResponse
✅ CreateOrderResponse
❌ userResponse
```

**API 方法名：** `camelCase` + 动词前缀

```typescript
✅ getUsers
✅ createOrder
✅ updateUserProfile
❌ Users
```

### 3. 目录组织

```
src/api/
├── user/
│   ├── api.ts
│   └── types.ts
├── order/
│   ├── api.ts
│   └── types.ts
└── product/
    ├── api.ts
    └── types.ts
```

### 4. 版本控制

```bash
# 提交生成的代码
git add src/api/
git commit -m "feat: add user api"

# 提交项目配置（推荐）
git add .apirc.json
git commit -m "chore: add api-gen config"

# 全局配置不需要提交
# ~/.apirc.json 是个人配置
```

## 🚨 故障排查

### 问题 1：请求超时

**解决：** 增加超时时间

```bash
go-gen config --global
# 设置 timeout: 30000
```

### 问题 2：类型名不对

**症状：** 输入 `ApiResponse`，生成 `APIResponse`

**解决：** 已在最新版本修复，使用 `acronym-style: camel`

### 问题 3：在不同项目生成的代码不一致

**解决：** 使用项目配置

```bash
cd your-project
go-gen init
# 编辑 .apirc.json
# 团队成员自动使用相同配置
```

## 📊 性能数据

| 操作                | 耗时   | 说明                 |
| ------------------- | ------ | -------------------- |
| 单个接口生成        | 3-5s   | 包括请求、生成、写入 |
| 批量生成 10 个接口  | 15-20s | OpenAPI 批量模式     |
| 批量生成 100 个接口 | 2-3min | 大型项目             |
| 增量写入            | 1-2s   | 追加到已存在文件     |

## 🧪 测试

项目包含完整的测试套件：

```bash
# 运行所有测试
npm test

# 查看覆盖率
npm test -- --coverage

# 运行特定测试
npm test config.test.js
npm test writer.test.js
npm test openapi.test.js
```

测试覆盖率：

- 配置系统: 100%
- 文件生成: 95%
- HTTP 方法: 100%
- 错误处理: 90%

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发环境设置

```bash
# 克隆项目
git clone https://github.com/your-username/go-gen.git
cd go-gen

# 安装依赖
npm install

# 运行测试
npm test

# 本地测试
npm link
go-gen fetch
```

### 提交规范

```bash
git commit -m "feat: add new feature"
git commit -m "fix: fix bug"
git commit -m "docs: update readme"
git commit -m "test: add tests"
```

## 📄 License

[MIT](./LICENSE)

## 📮 联系方式

- GitHub: [@your-username](https://github.com/your-username)
- Email: your.email@example.com
- Issues: [GitHub Issues](https://github.com/your-username/go-gen/issues)

---

**Made with ❤️ by goGenger**

如果这个项目对你有帮助，请给一个 ⭐️ Star！
