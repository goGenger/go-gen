function schemaToSample(schema) {
  if (!schema) return {};

  if (schema.type === 'object' && schema.properties) {
    const sample = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      sample[key] = schemaToSample(prop);
    }
    return sample;
  }

  if (schema.type === 'array' && schema.items) {
    return [schemaToSample(schema.items)];
  }

  const typeDefaults = {
    string: 'example',
    number: 0,
    integer: 0,
    boolean: false,
    object: {},
    array: [],
  };

  return typeDefaults[schema.type] || null;
}

module.exports = { schemaToSample };
