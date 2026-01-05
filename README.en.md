# 🚀 go-gen

[![npm](https://img.shields.io/npm/v/@gogenger/go-gen)](https://www.npmjs.com/package/@gogenger/go-gen)
[![Downloads](https://img.shields.io/npm/dm/@gogenger/go-gen)](https://www.npmjs.com/package/@gogenger/go-gen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@gogenger/go-gen)](https://nodejs.org)

A TypeScript API code generator that supports generating TypeScript interface code and type definitions from API responses or OpenAPI documents with one click.

English | [简体中文](./README.md)

## ✨ Features

- 🎯 **Fetch Mode** - Request API directly and auto-generate type definitions
- 📄 **OpenAPI Mode** - Batch generate from Swagger/OpenAPI documents
- 🔄 **Incremental Write** - Smart merge with existing files, no overwrite
- 🔀 **Conflict Resolution** - Auto-detect and rename duplicate types
- 🌐 **Multiple HTTP Methods** - Support GET, POST, PUT, DELETE, PATCH
- 🔐 **Authentication Support** - Bearer Token, Cookie, and more
- ⚙️ **Dual Configuration** - Global config + Project config for flexibility

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g @gogenger/go-gen
```

### Project Installation

```bash
npm install --save-dev @gogenger/go-gen
```

## 🎯 Quick Start

### Fetch Mode - Request API Directly

```bash
go-gen fetch
```

Follow the interactive prompts to input API information and generate code:

**Generated types.ts**

```typescript
export interface UserResponse {
  id: number;
  name: string;
  email: string;
}
```

**Generated api.ts**

```typescript
import request from '@/utils/request';
import type { UserResponse } from './types';

export function getUsers() {
  return request.get<UserResponse>('https://api.example.com/users');
}
```

### OpenAPI Mode - Generate from Documents

```bash
# Local file
go-gen openapi ./swagger.json

# Remote URL
go-gen openapi https://api.example.com/swagger.json
```

Supports both batch generation and individual generation modes.

## 📚 Documentation

- [Features Documentation](./docs/FEATURES.md) - Detailed feature descriptions
- [Configuration Guide](./docs/CONFIGURATION.md) - Configuration system explained
- [Use Cases](./docs/USE_CASES.md) - Real-world application examples
- [Best Practices](./docs/BEST_PRACTICES.md) - Team collaboration recommendations
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues and solutions

## 📝 Main Commands

```bash
# Fetch mode
go-gen fetch

# OpenAPI mode
go-gen openapi <source>

# Initialize project config
go-gen init

# Configuration management
go-gen config --show          # View config
go-gen config --global        # Set global config

# View help
go-gen --help
go-gen --version
```

## ⚙️ Quick Configuration

```bash
# Initialize project configuration
go-gen init

# Set global configuration
go-gen config --global
```

Configuration priority: Project config > Global config > Default config

See [Configuration Guide](./docs/CONFIGURATION.md) for details.

## 🤝 Contributing

Issues and Pull Requests are welcome!

Check out [Contributing Guide](./CONTRIBUTING.md) to learn how to participate in development.

## 📄 License

[MIT](./LICENSE)

## 📮 Contact

- GitHub: [@goGenger](https://github.com/goGenger)
- Email: bg2582266166@gmail.com
- Issues: [GitHub Issues](https://github.com/goGenger/go-gen/issues)

---

**Made with ❤️ by goGenger**

If this project helps you, please give it a ⭐️ Star!
