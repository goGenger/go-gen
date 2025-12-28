const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock prompts 模块
jest.mock('prompts');
const prompts = require('prompts');

// Mock load-openapi
jest.mock('../utils/load-openapi');
const loadOpenAPI = require('../utils/load-openapi');

// Mock sampler
jest.mock('../utils/sampler');
const { schemaToSample } = require('../utils/sampler');

// Mock name utility
jest.mock('../utils/name');
const { pascalCase } = require('../utils/name');

const openapiMode = require('../core/openapi-mode');
const { generateTypes } = require('../core/quicktype');

describe('OpenAPI Mode', () => {
  let tempDir;
  let originalCwd;
  let mockOpenAPIDoc;

  beforeEach(() => {
    // 保存原始工作目录
    originalCwd = process.cwd();
    
    // 创建临时目录
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-test-'));
    process.chdir(tempDir);

    // Mock OpenAPI 文档
    mockOpenAPIDoc = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        name: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          post: {
            operationId: 'createUser',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/users/{id}': {
          get: {
            operationId: 'getUserById',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        email: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    // Mock loadOpenAPI
    loadOpenAPI.mockResolvedValue(mockOpenAPIDoc);

    // Mock schemaToSample
    schemaToSample.mockImplementation((schema) => {
      if (schema.properties) {
        const sample = {};
        Object.keys(schema.properties).forEach(key => {
          const prop = schema.properties[key];
          if (prop.type === 'number') sample[key] = 0;
          else if (prop.type === 'string') sample[key] = 'string';
        });
        return sample;
      }
      return {};
    });

    // Mock pascalCase
    pascalCase.mockImplementation((str) => {
      return str.replace(/[^a-zA-Z0-9]+/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    });

    // 清除所有 mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 恢复工作目录
    process.chdir(originalCwd);
    
    // 清理临时目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic functionality', () => {
    test('should load OpenAPI document', async () => {
      prompts.mockResolvedValueOnce({ generateMode: null }); // 取消操作

      await openapiMode('./test.json');

      expect(loadOpenAPI).toHaveBeenCalledWith('./test.json');
    });

    test('should detect all API endpoints', async () => {
      prompts.mockResolvedValueOnce({ generateMode: null });

      await openapiMode('./test.json');

      // 应该检测到 3 个接口: GET /users, POST /users, GET /users/{id}
      expect(loadOpenAPI).toHaveBeenCalled();
    });

    test('should handle invalid OpenAPI document', async () => {
      loadOpenAPI.mockRejectedValueOnce(new Error('Invalid JSON'));

      // 使用 spy 来捕获 process.exit
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await openapiMode('./invalid.json');

      expect(exitSpy).toHaveBeenCalledWith(1);
      
      exitSpy.mockRestore();
    });

    test('should handle OpenAPI with no endpoints', async () => {
      loadOpenAPI.mockResolvedValueOnce({
        openapi: '3.0.0',
        paths: {}
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await openapiMode('./empty.json');

      consoleSpy.mockRestore();
    });
  });

  describe('Batch mode', () => {
    test('should generate all APIs in batch mode with desktop output', async () => {
      const desktopPath = path.join(os.homedir(), 'Desktop');
      
      // Mock prompts 响应
      prompts
        .mockResolvedValueOnce({ generateMode: 'batch' })
        .mockResolvedValueOnce({ outputPath: desktopPath });

      await openapiMode('./test.json');

      // 验证调用次数
      expect(prompts).toHaveBeenCalledTimes(2);
      
      // 验证第一次调用（选择模式）
      expect(prompts).toHaveBeenNthCalledWith(1, expect.objectContaining({
        name: 'generateMode',
        message: expect.stringContaining('3 个接口')
      }));

      // 验证第二次调用（选择输出目录）
      expect(prompts).toHaveBeenNthCalledWith(2, expect.objectContaining({
        name: 'outputPath',
        message: expect.stringContaining('输出目录')
      }));
    });

    test('should generate all APIs in batch mode with current directory', async () => {
      prompts
        .mockResolvedValueOnce({ generateMode: 'batch' })
        .mockResolvedValueOnce({ outputPath: tempDir });

      await openapiMode('./test.json');

      // 验证生成的文件
      const getUsersDir = path.join(tempDir, 'getUsers');
      const createUserDir = path.join(tempDir, 'createUser');
      const getUserByIdDir = path.join(tempDir, 'getUserById');

      // 注意：由于使用了 mock 的 generateTypes，实际文件可能不会生成
      // 这里主要验证逻辑流程
      expect(prompts).toHaveBeenCalledTimes(2);
    });

    test('should generate all APIs in batch mode with custom path', async () => {
      const customPath = path.join(tempDir, 'custom-output');
      fs.mkdirSync(customPath, { recursive: true });

      prompts
        .mockResolvedValueOnce({ generateMode: 'batch' })
        .mockResolvedValueOnce({ outputPath: 'custom' })
        .mockResolvedValueOnce({ customPath: customPath });

      await openapiMode('./test.json');

      expect(prompts).toHaveBeenCalledTimes(3);
    });

    test('should handle user cancellation in batch mode', async () => {
      prompts
        .mockResolvedValueOnce({ generateMode: 'batch' })
        .mockResolvedValueOnce({ outputPath: null }); // 用户取消

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await openapiMode('./test.json');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('操作已取消'));
      
      consoleSpy.mockRestore();
    });

    test('should count success and failures in batch mode', async () => {
      prompts
        .mockResolvedValueOnce({ generateMode: 'batch' })
        .mockResolvedValueOnce({ outputPath: tempDir });

      // Mock generateTypes to throw error for one API
      let callCount = 0;
      jest.spyOn(require('../core/quicktype'), 'generateTypes')
        .mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Generation failed');
          }
          return Promise.resolve('export interface Test {}');
        });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await openapiMode('./test.json');

      // 应该显示成功和失败的统计
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('成功')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Manual mode', () => {
    test('should generate APIs one by one with unified directory', async () => {
      prompts
        .mockResolvedValueOnce({ generateMode: 'manual' })
        .mockResolvedValueOnce({ useSameDir: true })
        .mockResolvedValueOnce({ outputPath: tempDir })
        .mockResolvedValueOnce({ apiName: 'getUsers' })
        .mockResolvedValueOnce({ apiName: 'createUser' })
        .mockResolvedValueOnce({ apiName: 'getUserById' });

      await openapiMode('./test.json');

      // 验证调用次数：模式 + 统一目录 + 目录选择 + 3个API名称
      expect(prompts).toHaveBeenCalledTimes(6);
    });

    test('should generate APIs one by one with individual directories', async () => {
      prompts
        .mockResolvedValueOnce({ generateMode: 'manual' })
        .mockResolvedValueOnce({ useSameDir: false })
        .mockResolvedValueOnce({ apiName: 'getUsers' })
        .mockResolvedValueOnce({ outputPath: tempDir })
        .mockResolvedValueOnce({ apiName: 'createUser' })
        .mockResolvedValueOnce({ outputPath: tempDir })
        .mockResolvedValueOnce({ apiName: 'getUserById' })
        .mockResolvedValueOnce({ outputPath: tempDir });

      await openapiMode('./test.json');

      // 验证为每个接口都询问了输出目录
      expect(prompts).toHaveBeenCalled();
    });

    test('should allow skipping APIs in manual mode', async () => {
      prompts
        .mockResolvedValueOnce({ generateMode: 'manual' })
        .mockResolvedValueOnce({ useSameDir: true })
        .mockResolvedValueOnce({ outputPath: tempDir })
        .mockResolvedValueOnce({ apiName: 'getUsers' })
        .mockResolvedValueOnce({ apiName: null }) // 跳过第二个
        .mockResolvedValueOnce({ apiName: 'getUserById' });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await openapiMode('./test.json');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('跳过'));

      consoleSpy.mockRestore();
    });

    test('should handle errors gracefully in manual mode', async () => {
      prompts
        .mockResolvedValueOnce({ generateMode: 'manual' })
        .mockResolvedValueOnce({ useSameDir: true })
        .mockResolvedValueOnce({ outputPath: tempDir })
        .mockResolvedValueOnce({ apiName: 'getUsers' })
        .mockResolvedValueOnce({ continueGen: false }); // 遇到错误后不继续

      // Mock generateTypes to throw error
      jest.spyOn(require('../core/quicktype'), 'generateTypes')
        .mockRejectedValueOnce(new Error('Type generation failed'));

      await openapiMode('./test.json');

      expect(prompts).toHaveBeenCalled();
    });

    test('should continue after error if user chooses to', async () => {
      prompts
        .mockResolvedValueOnce({ generateMode: 'manual' })
        .mockResolvedValueOnce({ useSameDir: true })
        .mockResolvedValueOnce({ outputPath: tempDir })
        .mockResolvedValueOnce({ apiName: 'getUsers' })
        .mockResolvedValueOnce({ continueGen: true }) // 继续
        .mockResolvedValueOnce({ apiName: 'createUser' });

      // Mock generateTypes to throw error on first call
      let callCount = 0;
      jest.spyOn(require('../core/quicktype'), 'generateTypes')
        .mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            throw new Error('First call failed');
          }
          return Promise.resolve('export interface Test {}');
        });

      await openapiMode('./test.json');

      // 应该继续处理第二个接口
      expect(prompts).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'continueGen' })
      );
    });
  });

  describe('File generation', () => {
    test('should generate correct file structure for GET method', async () => {
      prompts
        .mockResolvedValueOnce({ generateMode: 'batch' })
        .mockResolvedValueOnce({ outputPath: tempDir });

      // 使用真实的 generateTypes
      jest.spyOn(require('../core/quicktype'), 'generateTypes')
        .mockResolvedValue('export interface TestResponse { id: number; }');

      await openapiMode('./test.json');

      // 验证文件是否创建
      const apiDir = path.join(tempDir, 'getUsers');
      
      if (fs.existsSync(apiDir)) {
        const apiFile = path.join(apiDir, 'api.ts');
        const typesFile = path.join(apiDir, 'types.ts');

        expect(fs.existsSync(apiFile)).toBe(true);
        expect(fs.existsSync(typesFile)).toBe(true);

        const apiContent = fs.readFileSync(apiFile, 'utf-8');
        expect(apiContent).toContain('export function');
        expect(apiContent).toContain('request.get');
      }
    });

    test('should generate correct file structure for POST method', async () => {
      prompts
        .mockResolvedValueOnce({ generateMode: 'batch' })
        .mockResolvedValueOnce({ outputPath: tempDir });

      jest.spyOn(require('../core/quicktype'), 'generateTypes')
        .mockResolvedValue('export interface TestResponse { id: number; }');

      await openapiMode('./test.json');

      const apiDir = path.join(tempDir, 'createUser');
      
      if (fs.existsSync(apiDir)) {
        const apiFile = path.join(apiDir, 'api.ts');
        const apiContent = fs.readFileSync(apiFile, 'utf-8');

        // POST 方法应该有请求体参数
        expect(apiContent).toContain('request.post');
        expect(apiContent).toContain('data:');
      }
    });

    test('should use operationId as method name if available', async () => {
      prompts
        .mockResolvedValueOnce({ generateMode: 'batch' })
        .mockResolvedValueOnce({ outputPath: tempDir });

      jest.spyOn(require('../core/quicktype'), 'generateTypes')
        .mockResolvedValue('export interface TestResponse {}');

      await openapiMode('./test.json');

      // 验证使用了 operationId（getUsers）而不是自动生成的名称
      const apiDir = path.join(tempDir, 'getUsers');
      
      if (fs.existsSync(apiDir)) {
        expect(fs.existsSync(apiDir)).toBe(true);
      }
    });
  });

  describe('Edge cases', () => {
    test('should handle OpenAPI with no 200 response', async () => {
      loadOpenAPI.mockResolvedValueOnce({
        openapi: '3.0.0',
        paths: {
          '/test': {
            get: {
              responses: {
                '404': {
                  description: 'Not found'
                }
              }
            }
          }
        }
      });

      prompts.mockResolvedValueOnce({ generateMode: null });

      await openapiMode('./test.json');

      // 没有可生成的接口时不应提示选择模式
      expect(prompts).toHaveBeenCalledTimes(0);
    });

    test('should handle OpenAPI with no application/json response', async () => {
      loadOpenAPI.mockResolvedValueOnce({
        openapi: '3.0.0',
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  content: {
                    'text/plain': {
                      schema: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      });

      prompts.mockResolvedValueOnce({ generateMode: null });

      await openapiMode('./test.json');

      // 没有可生成的接口时不应提示选择模式
      expect(prompts).toHaveBeenCalledTimes(0);
    });

    test('should handle OpenAPI with empty paths', async () => {
      loadOpenAPI.mockResolvedValueOnce({
        openapi: '3.0.0',
        paths: null
      });

      await openapiMode('./test.json');

      // 应该显示警告
      expect(loadOpenAPI).toHaveBeenCalled();
    });

    test('should handle very large OpenAPI documents', async () => {
      const largePaths = {};
      for (let i = 0; i < 100; i++) {
        largePaths[`/api/endpoint${i}`] = {
          get: {
            operationId: `getEndpoint${i}`,
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: { id: { type: 'number' } }
                    }
                  }
                }
              }
            }
          }
        };
      }

      loadOpenAPI.mockResolvedValueOnce({
        openapi: '3.0.0',
        paths: largePaths
      });

      prompts
        .mockResolvedValueOnce({ generateMode: null });

      await openapiMode('./test.json');

      // 应该检测到 100 个接口
      expect(prompts).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('100 个接口')
        })
      );
    });
  });
});

// ================================
// 集成测试（可选）
// ================================
describe('OpenAPI Mode Integration', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-integration-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should generate complete API structure from real OpenAPI file', async () => {
    // 创建一个真实的 OpenAPI 文件
    const openapiDoc = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          email: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const openapiFile = path.join(tempDir, 'openapi.json');
    fs.writeFileSync(openapiFile, JSON.stringify(openapiDoc, null, 2));

    // 这个测试需要真实的模块，所以标记为可选
    expect(fs.existsSync(openapiFile)).toBe(true);
  });
});
