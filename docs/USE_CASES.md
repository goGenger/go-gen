# 🎨 使用场景

## 场景 1：快速对接第三方 API

**需求：** 需要调用一个第三方支付接口

```bash
go-gen fetch
```

**交互过程：**

```
🌐 请输入 API URL: https://api.payment.com/v1/orders
🔧 请求方法: POST
🔐 是否需要认证? Bearer Token
🔑 请输入 Bearer Token: sk_test_xxxxx
📦 该接口是否需要请求体? Yes
📝 请输入请求体 JSON:
{
  "amount": 100,
  "currency": "USD",
  "description": "Order #123"
}
📝 Response Type 名称: CreateOrderResponse
📦 API 方法名: createPaymentOrder
📂 输出目录: 📁 当前目录
```

**生成结果：** 30 秒内完成接口对接

---

## 场景 2：从 Swagger 文档批量生成

**需求：** 后端提供了 Swagger 文档，需要生成所有用户相关接口

```bash
go-gen openapi https://api.example.com/swagger.json
```

**选择批量模式：**

```
⚡ 批量生成中... (1/15): GET /users
⚡ 批量生成中... (2/15): POST /users
⚡ 批量生成中... (3/15): GET /users/{id}
...
✅ 批量生成完成！成功: 15，失败: 0
```

**优势：** 一次性生成所有接口，节省大量时间

---

## 场景 3：团队协作规范化

**场景描述：** 团队有 5 个前端开发，需要统一 API 调用方式

**步骤 1：项目负责人设置规范**

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

提交配置：

```bash
git add .apirc.json
git commit -m "chore: add api generator config"
git push
```

**步骤 2：团队成员使用**

```bash
git pull
go-gen fetch  # 自动使用团队配置
```

**效果：** 所有成员生成的代码风格统一，无需口头约定

---

## 场景 4：多项目维护

**场景描述：** 同时维护 3 个项目，每个项目使用不同的 HTTP 库

**项目 A（使用 axios）**

```bash
cd project-a
cat .apirc.json
# { "requestModule": "axios" }
go-gen fetch
```

生成的代码：

```typescript
import axios from 'axios';

export function getUsers() {
  return axios.get<UserResponse>('/api/users');
}
```

**项目 B（使用自定义 request）**

```bash
cd project-b
cat .apirc.json
# { "requestModule": "@/utils/http" }
go-gen fetch
```

生成的代码：

```typescript
import request from '@/utils/http';

export function getUsers() {
  return request.get<UserResponse>('/api/users');
}
```

**项目 C（使用 fetch）**

```bash
cd project-c
cat .apirc.json
# { "requestModule": "@/api/fetch" }
go-gen fetch
```

生成的代码：

```typescript
import request from '@/api/fetch';

export function getUsers() {
  return request.get<UserResponse>('/api/users');
}
```

**优势：** 自动适配各项目规范，无需手动调整

---

## 场景 5：迭代开发增量更新

**场景描述：** 项目已有 10 个接口，现在要新增 2 个

**第一次生成：**

```bash
go-gen fetch
# 输出到: src/api/user/
```

生成文件：

```
src/api/user/
├── api.ts        # 10 个 API 方法
└── types.ts      # 10 个类型定义
```

**新增接口：**

```bash
go-gen fetch
# 输出到: src/api/user/ (相同目录)
```

**结果：** 新接口自动追加，原有代码不受影响

```typescript
// api.ts
export function getUsers() { ... }          // 原有
export function createUser(data) { ... }    // 原有
export function updateUser(id, data) { ... } // 新增
export function deleteUser(id) { ... }       // 新增
```

---

## 场景 6：处理复杂认证

**场景描述：** 接口需要多个 Header

```bash
go-gen fetch
```

```
🔐 是否需要认证? Bearer Token
🔑 请输入 Bearer Token: your_token_here
```

如果需要额外的 Header，可以在生成后手动添加：

```typescript
export function getUsers() {
  return request.get<UserResponse>('/api/users', {
    headers: {
      'X-Custom-Header': 'value',
    },
  });
}
```

---

## 场景 7：调试和测试

**场景描述：** 开发环境测试接口

```bash
go-gen fetch
```

```
🌐 请输入 API URL: http://localhost:3000/api/test
```

生成代码后立即测试：

```typescript
import { getTest } from './api';

// 立即调用测试
getTest().then(data => {
  console.log('API 响应:', data);
});
```
