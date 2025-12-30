const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  loadConfig,
  saveGlobalConfig,
  saveLocalConfig,
  defaultConfig,
} = require('../core/config');

describe('Config Module', () => {
  let tempDir;
  let originalCwd;
  const GLOBAL_CONFIG_FILE = path.join(os.homedir(), '.apirc.json');

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-gen-test-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
      fs.unlinkSync(GLOBAL_CONFIG_FILE);
    }
  });

  test('should return default config when no config files exist', () => {
    const config = loadConfig();
    expect(config).toEqual(defaultConfig);
  });

  test('should merge global config with default config', () => {
    const globalConfig = { timeout: 20000 };
    saveGlobalConfig(globalConfig);

    const config = loadConfig();
    expect(config.timeout).toBe(20000);
    expect(config.autoRetry).toBe(defaultConfig.autoRetry);
  });

  test('should prioritize local config over global config', () => {
    const globalConfig = { requestModule: 'axios', timeout: 20000 };
    saveGlobalConfig(globalConfig);

    const localConfig = { requestModule: '@/utils/request' };
    saveLocalConfig(localConfig);

    const config = loadConfig();
    expect(config.requestModule).toBe('@/utils/request');
    expect(config.timeout).toBe(20000);
  });
});
