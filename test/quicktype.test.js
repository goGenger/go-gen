const { generateTypes } = require('../core/quicktype');

describe('Quicktype Module', () => {
  test('should generate types from JSON data', async () => {
    const mockData = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    };

    const result = await generateTypes(mockData, 'UserResponse');

    expect(result).toContain('export interface UserResponse');
    expect(result).toContain('id');
    expect(result).toContain('name');
    expect(result).toContain('email');
  });

  test('should handle nested objects', async () => {
    const mockData = {
      user: {
        id: 1,
        profile: {
          name: 'Test',
        },
      },
    };

    const result = await generateTypes(mockData, 'NestedResponse');

    expect(result).toContain('export interface NestedResponse');
  });

  test('should handle arrays', async () => {
    const mockData = {
      items: [1, 2, 3],
    };

    const result = await generateTypes(mockData, 'ArrayResponse');

    expect(result).toContain('export interface ArrayResponse');
    expect(result).toContain('items');
  });
});
