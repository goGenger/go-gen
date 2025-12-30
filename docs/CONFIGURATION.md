# ⚙️ 配置系统详解

## 双层配置设计

因为 CLI 工具安装在全局，但会在不同项目中使用：

- **全局配置** (`~/.apirc.json`) - 你的个人习惯
- **项目配置** (`./.apirc.json`) - 项目团队规范

**配置优先级：** 项目配置 > 全局配置 > 默认配置

## 初始化配置

```bash
# 初始化项目配置
go-gen init

# 设置全局配置
go-gen config --global

# 查看当前配置
go-gen config --show
```

## 配置示例

### 全局配置 (`~/.apirc.json`) - 个人偏好

```json
{
  "defaultOutputPath": "current",
  "timeout": 15000,
  "autoRetry": true,
  "maxRetries": 5
}
```

### 项目配置 (`.apirc.json`) - 团队规范

```json
{
  "requestModule": "@/utils/request",
  "typePrefix": "I",
  "apiPrefix": "api"
}
```

## 配置项说明

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

## 配置使用场景

### 场景 1：个人习惯配置（全局）

```bash
go-gen config --global
```

设置你常用的配置：

```json
{
  "timeout": 20000,
  "maxRetries": 5,
  "defaultOutputPath": "desktop"
}
```

### 场景 2：团队项目规范（项目）

```bash
cd your-project
go-gen init
```

编辑 `.apirc.json`：

```json
{
  "requestModule": "@/api/request",
  "typePrefix": "I",
  "apiPrefix": "api"
}
```

提交到 Git：

```bash
git add .apirc.json
git commit -m "chore: add api generator config"
```

### 场景 3：多项目维护

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

每个项目自动使用各自的配置，无需手动切换。

## 配置优先级示例

假设有以下配置：

**默认配置：**

```json
{
  "timeout": 10000,
  "maxRetries": 3,
  "requestModule": "@/utils/request"
}
```

**全局配置 (`~/.apirc.json`)：**

```json
{
  "timeout": 15000,
  "maxRetries": 5
}
```

**项目配置 (`.apirc.json`)：**

```json
{
  "maxRetries": 2,
  "requestModule": "axios"
}
```

**最终生效的配置：**

```json
{
  "timeout": 15000, // 来自全局配置
  "maxRetries": 2, // 来自项目配置（优先级最高）
  "requestModule": "axios" // 来自项目配置
}
```
