function isValidIdentifier(name) {
  return /^[A-Za-z][A-Za-z0-9]*$/.test(name);
}

function pascalCase(name) {
  // 如果用户已经输入了合法 TS 名称，直接返回
  if (isValidIdentifier(name)) {
    return name;
  }

  // 否则才进行 pascalCase
  return name
    .replace(/[-_/](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

module.exports = { pascalCase };
