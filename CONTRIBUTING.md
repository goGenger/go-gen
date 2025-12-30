# 🤝 贡献指南

感谢你对 go-gen 的关注！我们欢迎所有形式的贡献。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [代码规范](#代码规范)

## 行为准则

参与本项目即表示你同意遵守我们的 [行为准则](./CODE_OF_CONDUCT.md)。

## 如何贡献

### 报告 Bug

在提交 Bug 之前，请先搜索 [现有 Issues](https://github.com/goGenger/go-gen/issues) 确认问题是否已被报告。

提交 Bug 时请包含：

- 清晰的标题和描述
- 重现步骤
- 期望的行为
- 实际的行为
- 环境信息（OS、Node 版本、go-gen 版本）
- 相关日志或截图

### 提出新功能

我们欢迎新功能建议！请：

1. 先在 Issues 中讨论
2. 说明功能的使用场景
3. 如果可能，提供实现思路

### 提交代码

1. Fork 项目
2. 创建功能分支
3. 编写代码和测试
4. 提交 Pull Request

## 开发环境设置

### 1. Fork 和克隆项目

```bash
# Fork 项目到你的账号
# 然后克隆到本地
git clone https://github.com/YOUR_USERNAME/go-gen.git
cd go-gen
```

### 2. 安装依赖

```bash
npm install
```

### 3. 链接到全局

```bash
npm link
```

现在你可以使用本地版本的 `go-gen` 命令。

### 4. 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- config.test.js

# 查看覆盖率
npm test -- --coverage

# 监听模式（开发时使用）
npm test -- --watch
```

### 5. 本地测试

```bash
# 测试 fetch 模式
go-gen fetch

# 测试 openapi 模式
go-gen openapi ./test/fixtures/swagger.json

# 测试配置
go-gen config --show
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具的变动

### 示例

```bash
# 新功能
git commit -m "feat(openapi): add support for OpenAPI 3.1"

# 修复 Bug
git commit -m "fix(writer): resolve type conflict issue"

# 文档
git commit -m "docs: update configuration guide"

# 测试
git commit -m "test: add tests for retry mechanism"

# 重构
git commit -m "refactor(config): simplify config merge logic"
```

### Scope 范围

常用的 scope：

- `fetch`: Fetch 模式相关
- `openapi`: OpenAPI 模式相关
- `config`: 配置系统
- `writer`: 文件写入
- `cli`: 命令行界面
- `test`: 测试相关
- `docs`: 文档相关

## Pull Request 流程

### 1. 创建分支

```bash
# 从 main 分支创建功能分支
git checkout -b feat/your-feature-name

# 或修复分支
git checkout -b fix/your-bug-fix
```

### 2. 编写代码

- 遵循项目的代码规范
- 添加必要的测试
- 更新相关文档
- 确保所有测试通过

### 3. 提交代码

```bash
git add .
git commit -m "feat: add new feature"
```

### 4. 推送到 GitHub

```bash
git push origin feat/your-feature-name
```

### 5. 创建 Pull Request

在 GitHub 上创建 PR，包含：

- 清晰的标题
- 详细的描述
- 相关的 Issue 链接
- 截图或示例（如果适用）

### 6. 代码审查

- 响应审查意见
- 根据反馈修改代码
- 保持 PR 更新

### 7. 合并

通过审查后，维护者会合并你的 PR。

## 代码规范

### JavaScript/TypeScript

- 使用 2 空格缩进
- 使用单引号
- 添加必要的注释
- 避免过长的函数（建议少于 50 行）

### 文件结构

```
core/
├── config/          # 配置相关
├── generator/       # 代码生成
├── writer/          # 文件写入
├── parser/          # 解析器
└── utils/           # 工具函数

test/
├── unit/            # 单元测试
├── integration/     # 集成测试
└── fixtures/        # 测试数据
```

### 命名规范

- **文件名**: `kebab-case.js`
- **类名**: `PascalCase`
- **函数名**: `camelCase`
- **常量**: `UPPER_SNAKE_CASE`

### 测试规范

```javascript
describe('Feature Name', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = someFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### 错误处理

```javascript
// ✅ 推荐
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error.message);
  throw new Error(`Failed to complete operation: ${error.message}`);
}

// ❌ 不推荐
try {
  await riskyOperation();
} catch (error) {
  // 静默失败
}
```

## 文档更新

如果你的改动涉及：

- 新功能
- API 变更
- 配置变更
- 使用方式变更

请同时更新相关文档：

- `README.md`
- `docs/FEATURES.md`
- `docs/CONFIGURATION.md`
- 其他相关文档

## 发布流程

（仅供维护者参考）

1. 更新版本号

   ```bash
   npm version patch|minor|major
   ```

2. 更新 CHANGELOG

   ```bash
   # 添加版本变更说明
   vim CHANGELOG.md
   ```

3. 提交并打标签

   ```bash
   git add .
   git commit -m "chore: release v1.2.3"
   git tag v1.2.3
   ```

4. 推送到 GitHub

   ```bash
   git push origin main --tags
   ```

5. 发布到 npm

   ```bash
   npm publish
   ```

6. 创建 GitHub Release
   - 使用标签创建 Release
   - 复制 CHANGELOG 内容

## 获取帮助

- 💬 [GitHub Discussions](https://github.com/goGenger/go-gen/discussions)
- 🐛 [GitHub Issues](https://github.com/goGenger/go-gen/issues)
- 📧 Email: bg2582266166@gmail.com

## 致谢

感谢所有贡献者！你们的参与让 go-gen 变得更好。

### 贡献者

查看 [贡献者列表](https://github.com/goGenger/go-gen/graphs/contributors)

---

再次感谢你的贡献！🎉
