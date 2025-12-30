# 🎓 最佳实践

## 1. 团队规范化

### 推荐做法

在项目根目录创建 `.apirc.json`：

```json
{
  "requestModule": "@/api/request",
  "typePrefix": "I",
  "apiPrefix": "api"
}
```

### 优势

- ✅ 团队成员自动使用统一配置
- ✅ 新成员无需额外培训
- ✅ 代码风格高度一致
- ✅ 减少 Code Review 时间

### 提交规范

```bash
git add .apirc.json
git commit -m "chore: add api generator config"
```

---

## 2. 命名规范

### 类型名：PascalCase + Response 后缀

✅ **推荐：**

```typescript
UserResponse;
CreateOrderResponse;
UpdateProfileResponse;
```

❌ **不推荐：**

```typescript
userResponse; // 首字母小写
User; // 缺少后缀
user_response; // 下划线命名
```

### API 方法名：camelCase + 动词前缀

✅ **推荐：**

```typescript
getUsers();
createOrder();
updateUserProfile();
deletePost();
```

❌ **不推荐：**

```typescript
Users(); // 缺少动词
GetUsers(); // 首字母大写
user_list(); // 下划线命名
```

### 动词建议

| HTTP 方法 | 推荐动词前缀           |
| --------- | ---------------------- |
| GET       | get, fetch, query      |
| POST      | create, add            |
| PUT       | update, replace        |
| PATCH     | update, modify         |
| DELETE    | delete, remove, revoke |

---

## 3. 目录组织

### 推荐结构

```
src/api/
├── user/
│   ├── api.ts          # 用户相关 API
│   └── types.ts        # 用户相关类型
├── order/
│   ├── api.ts          # 订单相关 API
│   └── types.ts        # 订单相关类型
├── product/
│   ├── api.ts          # 产品相关 API
│   └── types.ts        # 产品相关类型
└── common/
    ├── api.ts          # 通用 API
    └── types.ts        # 通用类型
```

### 优势

- ✅ 模块化清晰
- ✅ 便于维护和查找
- ✅ 减少命名冲突
- ✅ 支持按需导入

---

## 4. 版本控制

### 应该提交的文件

```bash
# ✅ 生成的代码（推荐提交）
git add src/api/

# ✅ 项目配置（强烈推荐）
git add .apirc.json

# ✅ 文档更新
git add docs/
```

### 不应该提交的文件

```bash
# ❌ 全局配置（个人配置）
# ~/.apirc.json 不要提交

# ❌ 临时文件
# *.tmp, *.bak 等
```

### Commit 规范

```bash
# 新增接口
git commit -m "feat: add user api"

# 更新接口
git commit -m "feat: update order api"

# 添加配置
git commit -m "chore: add api-gen config"

# 修复问题
git commit -m "fix: correct api type definition"
```

---

## 5. 类型安全

### 使用泛型

```typescript
// ✅ 推荐：使用泛型
export function getUsers() {
  return request.get<UserResponse>('/api/users');
}

// ❌ 不推荐：不指定类型
export function getUsers() {
  return request.get('/api/users');
}
```

### 避免 any

```typescript
// ✅ 推荐：明确类型
export interface CreateUserRequest {
  name: string;
  email: string;
}

// ❌ 不推荐：使用 any
export interface CreateUserRequest {
  [key: string]: any;
}
```

---

## 6. 错误处理

### 统一错误处理

在 `request` 模块中统一处理：

```typescript
// @/utils/request.ts
import axios from 'axios';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 统一错误处理
request.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  },
);

export default request;
```

---

## 7. 增量开发

### 新增接口时

```bash
# 输出到已存在的目录
go-gen fetch
# 选择相同的输出目录
```

### 注意事项

- ✅ 新接口会自动追加
- ✅ 已有代码不会被覆盖
- ⚠️ 类型名冲突会自动重命名
- ⚠️ 检查是否有重复的 API 方法

---

## 8. 性能优化

### 批量生成时

```bash
# OpenAPI 批量模式
go-gen openapi https://api.example.com/swagger.json
# 选择 "批量生成"
```

### 单个生成时

```bash
# 只生成需要的接口
go-gen fetch
```

### 建议

- ✅ 大型项目用批量模式
- ✅ 小型项目或单个接口用 fetch 模式
- ✅ 定期清理不用的接口

---

## 9. 团队协作流程

### 步骤 1：项目负责人

```bash
# 初始化配置
go-gen init

# 编辑 .apirc.json
vim .apirc.json

# 提交配置
git add .apirc.json
git commit -m "chore: setup api generator config"
git push
```

### 步骤 2：团队成员

```bash
# 拉取配置
git pull

# 直接使用
go-gen fetch
```

### 步骤 3：代码审查

```bash
# 检查生成的代码
git diff src/api/

# 确认无误后提交
git add src/api/
git commit -m "feat: add new api endpoints"
```

---

## 10. 文档维护

### 在 README 中说明

```markdown
## API 生成

本项目使用 `go-gen` 生成 API 代码。

### 生成新接口

\`\`\`bash
go-gen fetch
\`\`\`

### 配置

查看 `.apirc.json` 了解项目配置。
\`\`\`
```

### 保持文档同步

- 更新 API 时更新文档
- 记录重要的配置变更
- 说明特殊的使用方式
