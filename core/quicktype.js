const {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
} = require("quicktype-core");

async function generateTypes(jsonData, typeName) {
  const jsonInput = jsonInputForTargetLanguage("typescript");
  await jsonInput.addSource({
    name: typeName,
    samples: [JSON.stringify(jsonData)],
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  const result = await quicktype({
    inputData,
    lang: "typescript",
    rendererOptions: {
      "just-types": "true",
      "acronym-style": "camel",
      "prefer-unions": "true",
      "explicit-unions": "true",
    },
  });

  return result.lines.join("\n");
}

module.exports = { generateTypes };