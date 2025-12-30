const {
  generateApiFile,
  resolveTypeNameConflict,
  validatePath,
} = require('../core/writer');

describe('Writer Module', () => {
  describe('generateApiFile', () => {
    test('should generate GET request without body', () => {
      const result = generateApiFile({
        apiName: 'getUsers',
        typeName: 'UserResponse',
        url: '/api/users',
        method: 'GET',
        hasRequestBody: false,
      });

      expect(result).toContain('export function getUsers()');
      expect(result).toContain('request.get<UserResponse>("/api/users")');
      expect(result).not.toContain('data:');
    });

    test('should generate POST request with body', () => {
      const result = generateApiFile({
        apiName: 'createUser',
        typeName: 'UserResponse',
        url: '/api/users',
        method: 'POST',
        hasRequestBody: true,
      });

      expect(result).toContain(
        'export function createUser(data: UserResponseRequest)',
      );
      expect(result).toContain(
        'request.post<UserResponse>("/api/users", data)',
      );
    });

    test('should generate PUT request', () => {
      const result = generateApiFile({
        apiName: 'updateUser',
        typeName: 'UserResponse',
        url: '/api/users/1',
        method: 'PUT',
        hasRequestBody: true,
      });

      expect(result).toContain('request.put<UserResponse>');
    });

    test('should generate DELETE request', () => {
      const result = generateApiFile({
        apiName: 'deleteUser',
        typeName: 'UserResponse',
        url: '/api/users/1',
        method: 'DELETE',
        hasRequestBody: false,
      });

      expect(result).toContain('request.delete<UserResponse>');
    });

    test('should generate PATCH request', () => {
      const result = generateApiFile({
        apiName: 'patchUser',
        typeName: 'UserResponse',
        url: '/api/users/1',
        method: 'PATCH',
        hasRequestBody: true,
      });

      expect(result).toContain('request.patch<UserResponse>');
    });
  });

  describe('resolveTypeNameConflict', () => {
    test('should not modify name if no conflict', () => {
      const { finalTypeName, hasConflict } = resolveTypeNameConflict(
        ['User', 'Order'],
        'Product',
      );
      expect(finalTypeName).toBe('Product');
      expect(hasConflict).toBe(false);
    });

    test('should add suffix if conflict exists', () => {
      const { finalTypeName, hasConflict } = resolveTypeNameConflict(
        ['User', 'Order'],
        'User',
      );
      expect(finalTypeName).toBe('User1');
      expect(hasConflict).toBe(true);
    });

    test('should increment suffix for multiple conflicts', () => {
      const { finalTypeName } = resolveTypeNameConflict(
        ['User', 'User1', 'User2'],
        'User',
      );
      expect(finalTypeName).toBe('User3');
    });
  });

  describe('validatePath', () => {
    test('should allow safe paths', () => {
      const tempPath = require('os').tmpdir();
      expect(() => validatePath(tempPath)).not.toThrow();
      expect(() => validatePath('./test')).not.toThrow();
    });

    test('should reject system paths', () => {
      if (process.platform === 'win32') {
        expect(() => validatePath('C:\\Windows\\test')).toThrow(
          '不允许写入系统目录',
        );
      } else {
        expect(() => validatePath('/System/test')).toThrow(
          '不允许写入系统目录',
        );
        expect(() => validatePath('/usr/local')).toThrow('不允许写入系统目录');
        expect(() => validatePath('/bin')).toThrow('不允许写入系统目录');
      }
    });
  });
});
