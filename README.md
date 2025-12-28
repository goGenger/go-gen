# 🚀 API 代码生成器 CLI

一键生成 TypeScript API 接口代码和类型定义，支持 Fetch 模式和 OpenAPI 规范。

## ✨ 核心特性

- 🔄 **增量写入** - 智能检测已存在文件，自动追加新内容
- 🔀 **类型冲突处理** - 自动检测并重命名重复类型
- 🌐 **多种 HTTP 方法** - 支持 GET、POST、PUT、DELETE、PATCH
- 🔐 **认证支持** - Bearer Token、Cookie 等多种认证方式
- 🔁 **自动重试** - 网络请求失败自动重试，提高稳定性
- ⚙️ **双层配置** - 全局配置 + 项目配置，灵活适配多项目
- ⚡ **批量生成** - OpenAPI 模式支持批量生成所有接口
- 🛡️ **安全检查** - 防止写入系统目录

## 📦 安装

```bash
npm install -g go-generator-cli
```

## 🎯 快速开始

### 第一次使用

```bash
# 1. 配置全局偏好（可选，个人习惯设置）
go-gen config --global

# 2. 在项目中初始化配置（推荐，团队共享）
cd your-project
go-gen init

# 3. 开始生成接口
go-gen fetch
```

## 🔧 配置系统（双层设计）

### 为什么需要双层配置？

因为 CLI 工具安装在全局，但会在不同项目中使用：

- **全局配置** (`~/.apirc.json`) - 你的个人习惯
  - 默认输出路径偏好
  - 网络超时设置
  - 是否自动重试
- **项目配置** (`./apirc.json`) - 项目团队规范
  - request 模块路径（每个项目可能不同）
  - 命名前缀规范（团队统一风格）
  - 提交到 Git，团队共享

### 配置优先级

```
项目配置 > 全局配置 > 默认配置
```

### 配置示例

**全局配置** (`~/.apirc.json`)

```json
{
  "defaultOutputPath": "current",
  "timeout": 15000,
  "autoRetry": true,
  "maxRetries": 5
}
```

**项目 A 配置** (`project-a/.apirc.json`)

```json
{
  "requestModule": "@/utils/request",
  "typePrefix": "I",
  "apiPrefix": "api"
}
```

**项目 B 配置** (`project-b/.apirc.json`)

```json
{
  "requestModule": "@/api/http",
  "typePrefix": "",
  "apiPrefix": ""
}
```

**实际效果：**

- 在 `project-a` 运行：使用 A 的配置 + 你的全局偏好
- 在 `project-b` 运行：使用 B 的配置 + 你的全局偏好
- 在其他目录运行：只使用全局配置

## 📖 命令详解

### 1. `go-gen fetch` - Fetch 模式

直接请求 API 并生成代码。

```bash
go-gen fetch
```

交互式问答：

```
? 🌐 请输入 API URL: https://api.example.com/users
? 🔧 请求方法: GET
? 🔐 是否需要认证? Bearer Token
? 🔑 请输入 Bearer Token: ********
? 📝 Response Type 名称: UserResponse
? 📦 API 方法名: getUsers
? 📂 输出目录: 📁 当前目录
```

生成结果：

```typescript
// types.ts
export interface UserResponse {
  id: number;
  name: string;
  email: string;
}

// api.ts
import request from "@/utils/request";
import type { UserResponse } from "./types";

export function getUsers() {
  return request.get<UserResponse>("https://api.example.com/users");
}
```

### 2. `go-gen openapi <source>` - OpenAPI 模式

从 Swagger/OpenAPI 文档批量生成。

```bash
# 本地文件
go-gen openapi ./swagger.json

# 远程 URL
go-gen openapi https://api.example.com/swagger.json
```

支持两种生成模式：

- **逐个生成** - 可自定义每个接口的名称
- **批量生成** - 自动命名，快速生成所有接口

### 3. `go-gen init` - 初始化项目配置

在当前项目创建配置文件。

```bash
cd your-project
go-gen init
```

会创建 `.apirc.json` 文件，包含项目特定配置：

```json
{
  "requestModule": "@/utils/request",
  "typePrefix": "",
  "apiPrefix": ""
}
```

**建议：将此文件提交到 Git，供团队共享！**

### 4. `go-gen config` - 配置管理

#### 查看当前配置

```bash
go-gen config --show
```

输出示例：

```
📋 当前生效的配置:

配置来源:
  ✅ 全局配置: /Users/you/.apirc.json
  ✅ 项目配置: /path/to/project/.apirc.json

最终配置:
  defaultOutputPath: "current"
  requestModule: "@/utils/request"
  timeout: 15000
  ...
```

#### 设置全局配置

```bash
go-gen config --global
```

交互式设置你的个人偏好。

#### 初始化全局配置

```bash
go-gen config --init-global
```

创建 `~/.apirc.json` 全局配置文件。

### 5. `go-gen help` - 帮助信息

```bash
go-gen help
```

显示详细的使用指南。

## 🎨 实际使用场景

### 场景 1：个人开发者（单项目）

```bash
# 配置一次全局设置
go-gen config --global

# 直接使用
go-gen fetch
```

### 场景 2：团队协作（多项目）

```bash
# 项目负责人：在项目中创建配置
cd project-a
go-gen init
# 编辑 .apirc.json 设置团队规范
git add .apirc.json
git commit -m "chore: add api generator config"

# 团队成员：拉取代码后直接使用
cd project-a
go-gen fetch  # 自动使用项目配置
```

### 场景 3：同时维护多个项目

```bash
# 项目 A（使用 axios）
cd project-a
cat .apirc.json
{
  "requestModule": "axios",
  "typePrefix": "I"
}
go-gen fetch  # 生成 axios 风格代码

# 项目 B（使用自定义 request）
cd project-b
cat .apirc.json
{
  "requestModule": "@/utils/http",
  "typePrefix": ""
}
go-gen fetch  # 生成项目 B 风格代码
```

### 场景 4：增量开发

```bash
# Day 1: 生成用户接口
go-gen fetch
# 生成 users/api.ts 和 users/types.ts

# Day 2: 添加更多接口到同一目录
go-gen fetch
# 选择相同目录 "users"
# 自动追加到 users/api.ts ✨
```

## 🔄 增量写入详解

### 第一次生成

```bash
go-gen fetch
# 输入: getUsers
# 输出: users/api.ts, users/types.ts
```

```typescript
// users/api.ts
export function getUsers() { ... }

// users/types.ts
export interface UserResponse { ... }
```

### 第二次生成（相同目录）

```bash
go-gen fetch
# 输入: createUser
# 选择目录: users（已存在）
# 输出: 追加到现有文件 ✨
```

```typescript
// users/api.ts
import type { UserResponse, CreateUserResponse } from "./types";

export function getUsers() { ... }

export function createUser(data: CreateUserRequest) { ... }  // 新增

// users/types.ts
export interface UserResponse { ... }

export interface CreateUserResponse { ... }  // 新增
export interface CreateUserRequest { ... }   // 新增
```

### 类型冲突自动解决

```bash
# 尝试生成重复类型名
go-gen fetch
# 输入类型名: ApiResponse（已存在）

# 输出
⚠️  类型名冲突，已自动重命名: ApiResponse → ApiResponse1
✨ 生成成功！（类型已重命名为 ApiResponse1）
```

## 🌐 支持的 HTTP 方法

| 方法   | 请求体 | 生成示例                      |
| ------ | ------ | ----------------------------- |
| GET    | ❌     | `request.get<T>(url)`         |
| POST   | ✅     | `request.post<T>(url, data)`  |
| PUT    | ✅     | `request.put<T>(url, data)`   |
| DELETE | ❌     | `request.delete<T>(url)`      |
| PATCH  | ✅     | `request.patch<T>(url, data)` |

## 🔐 认证方式

### Bearer Token

```bash
? 🔐 是否需要认证? Bearer Token
? 🔑 请输入 Bearer Token: ********
```

请求时自动添加 `Authorization: Bearer xxx`

### Cookie

```bash
? 🔐 是否需要认证? Cookie
? 🍪 请输入 Cookie: sessionid=abc123
```

请求时自动添加 `Cookie: sessionid=abc123`

## ⚙️ 完整配置项

### 全局配置项（推荐设置）

| 配置项              | 类型    | 默认值      | 说明                                      |
| ------------------- | ------- | ----------- | ----------------------------------------- |
| `defaultOutputPath` | string  | `'current'` | 默认输出路径：`current`、`desktop`、`ask` |
| `timeout`           | number  | `10000`     | 请求超时时间（毫秒）                      |
| `autoRetry`         | boolean | `true`      | 失败是否自动重试                          |
| `maxRetries`        | number  | `3`         | 最大重试次数                              |

### 项目配置项（推荐设置）

| 配置项          | 类型   | 默认值              | 说明                                         |
| --------------- | ------ | ------------------- | -------------------------------------------- |
| `requestModule` | string | `'@/utils/request'` | request 模块导入路径                         |
| `typePrefix`    | string | `''`                | 类型名前缀（如 `'I'` → `IUserResponse`）     |
| `apiPrefix`     | string | `''`                | API 方法名前缀（如 `'api'` → `apiGetUsers`） |
| `defaultMethod` | string | `'GET'`             | 默认 HTTP 方法                               |

## 🎓 最佳实践

### 1. 团队规范化

```bash
# 项目负责人
cd your-project
go-gen init

# 编辑 .apirc.json
{
  "requestModule": "@/api/request",
  "typePrefix": "I",
  "apiPrefix": "api"
}

# 提交到 Git
git add .apirc.json
git commit -m "chore: add go-gen config"

# 团队成员自动遵循规范
```

### 2. 目录组织

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

### 3. 命名规范

**类型名：** `PascalCase` + `Response` 后缀

- ✅ `UserResponse`
- ✅ `CreateOrderResponse`
- ❌ `userResponse`

**API 方法名：** `camelCase` + 动词前缀

- ✅ `getUsers`
- ✅ `createOrder`
- ✅ `updateUserProfile`
- ❌ `Users`

### 4. 配置文件管理

```bash
# .gitignore
.apirc.json  # ❌ 不要忽略项目配置！应该提交
~/.apirc.json  # ✅ 全局配置无需提交（在用户本地）
```

## 🚨 故障排查

### 问题：在不同项目生成的代码不一致

**原因：** 没有使用项目配置

**解决：**

```bash
cd your-project
go-gen init  # 创建项目配置
# 编辑 .apirc.json
git add .apirc.json  # 提交供团队共享
```

### 问题：团队成员生成的代码风格不统一

**原因：** 每个人有不同的全局配置

**解决：** 使用项目配置覆盖全局配置

```bash
# 项目配置优先级更高，会覆盖全局配置
go-gen init
```

### 问题：请求一直超时

**解决：** 调整全局超时配置

```bash
go-gen config --global
# 设置更长的超时时间
```

## 📊 配置优先级示例

**场景：** 三个配置中都有 `requestModule`

```
默认配置:  requestModule = "@/utils/request"
全局配置:  requestModule = "axios"
项目配置:  requestModule = "@/api/http"

最终使用: "@/api/http"  ← 项目配置优先
```

**场景：** 只有全局配置

```
默认配置:  timeout = 10000
全局配置:  timeout = 30000
项目配置:  (无)

最终使用: 30000  ← 全局配置生效
```

## 🆘 获取帮助

```bash
# 查看版本
go-gen --version

# 查看帮助
go-gen help

# 查看配置
go-gen config --show
```

## 📄 License

MIT License
