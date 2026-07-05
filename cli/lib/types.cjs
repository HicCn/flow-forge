// Shared type mapping & utilities for code generators

const TYPE_MAP = {
  csharp: {
    string: 'string',
    number: 'int',
    float: 'float',
    boolean: 'bool',
    text: 'string',
    enum: 'string',
  },
  typescript: {
    string: 'string',
    number: 'number',
    float: 'number',
    boolean: 'boolean',
    text: 'string',
    enum: 'string',
  },
};

const DEFAULT_VALUES = {
  csharp: {
    string: '""',
    number: '0',
    float: '0f',
    boolean: 'false',
    text: '""',
    enum: '""',
  },
  typescript: {
    string: "''",
    number: '0',
    float: '0',
    boolean: 'false',
    text: "''",
    enum: "''",
  },
};

/**
 * Convert snake_case key to PascalCase property name.
 * play_animation → PlayAnimation
 */
function toPascalCase(key) {
  return key.charAt(0).toUpperCase() + key.slice(1)
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Convert node type to class name.
 * dialogue_line → DialogueLineNode
 */
function toClassName(type) {
  return toPascalCase(type) + 'Node';
}

/**
 * Validate node definition before generation.
 */
function validate(def) {
  const errors = [];
  if (!def.type || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(def.type))
    errors.push(`Invalid node type: ${def.type}`);
  for (const p of (def.params || [])) {
    if (!p.key || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p.key))
      errors.push(`Invalid param key '${p.key}' in ${def.type}`);
    if (!TYPE_MAP.csharp[p.type])
      errors.push(`Unknown param type '${p.type}' in ${def.type}.${p.key}`);
  }
  for (const pin of (def.pins?.inputs || [])) {
    if (!pin.id || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(pin.id))
      errors.push(`Invalid input pin '${pin.id}' in ${def.type}`);
  }
  for (const pin of (def.pins?.outputs || [])) {
    if (!pin.id || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(pin.id))
      errors.push(`Invalid output pin '${pin.id}' in ${def.type}`);
  }
  return errors;
}

module.exports = { TYPE_MAP, DEFAULT_VALUES, toPascalCase, toClassName, validate };
