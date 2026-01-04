# 1.0.0 (2026-01-04)


### Bug Fixes

* **ci:** 修正工作流中包名称的路径错误 ([5f3af29](https://github.com/goGenger/go-gen/commit/5f3af29fe9ae0208a4ef941fd2ed8c2eeb1a6b12))
* **fetch-mode:** 修复请求取消逻辑和竞态条件问题 ([7d52d83](https://github.com/goGenger/go-gen/commit/7d52d830a40fb431d60ac0fd331071dc187afc6e))
* **fetch-mode:** 移除未使用的spinner参数并修复userCancelled变量声明 ([6e5c519](https://github.com/goGenger/go-gen/commit/6e5c519a6d965f8eee50d5850547b4ca37f29ce9))
* 将userCancelled改为可变量以标记请求取消状态 ([15de5a4](https://github.com/goGenger/go-gen/commit/15de5a45ae9aa8d3606ce9a4a2f47469c20cf975))


### Features

* **ci:** 添加 GitHub issue 模板和 release 工作流 ([43a2655](https://github.com/goGenger/go-gen/commit/43a265589d066f29a526f7c6d005a137c611d121))
* 重构核心模块并更新项目元数据 ([4f8bb3e](https://github.com/goGenger/go-gen/commit/4f8bb3e0148a664e5fdc3cc22da53426e201f5b3))

# 更新日志 / Changelog

本文档记录项目的所有重要变更。

All notable changes to this project will be documented in this file.

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [未发布 / Unreleased]

### 新增 / Added

- 初始文档结构 / Initial documentation structure
- 贡献指南 / Contributing guidelines
- 最佳实践指南 / Best practices guide

## [1.0.0] - 2025-12-30

### 新增 / Added

- 首次发布 / Initial release
- 🎯 Fetch 模式，支持直接请求 API / Fetch mode for direct API requests
- 📄 OpenAPI 模式，支持批量生成 / OpenAPI mode for batch generation
- 🔄 增量写入，智能合并文件 / Incremental write with smart merge
- 🔀 自动冲突处理 / Automatic conflict resolution
- 🌐 支持多种 HTTP 方法（GET、POST、PUT、DELETE、PATCH）/ Support for multiple HTTP methods
- 🔐 认证支持（Bearer Token、Cookie）/ Authentication support
- 🔁 自动重试机制 / Automatic retry mechanism
- ⚙️ 双层配置系统（全局 + 项目）/ Dual-layer configuration system
- ⚡ 批量生成模式 / Batch generation mode
- 🎨 类型安全的代码生成 / Type-safe code generation

[未发布 / Unreleased]: https://github.com/goGenger/go-gen/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/goGenger/go-gen/compare/v0.9.0...v1.0.0
