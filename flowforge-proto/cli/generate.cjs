#!/usr/bin/env node
/**
 * FlowForge Code Generator CLI
 *
 * Usage:
 *   node cli/generate.cjs --lang <csharp|typescript> [--flow <path> | --defs <path>] [--out <dir>]
 *
 * Options:
 *   --lang     Target language (required): csharp | typescript
 *   --flow     Input .flow JSON file (for quick testing)
 *   --defs     Input NodeDefinition[] JSON file (for production use with full types)
 *   --out      Output directory for generated files (default: cli/output/<lang>/)
 *   --copy     Also copy runtime framework files to output
 */

const fs = require('fs');
const path = require('path');
const { validate } = require('./lib/types.cjs');
const genCSharp = require('./lib/gen-csharp.cjs');
const genTypeScript = require('./lib/gen-typescript.cjs');

// ── CLI args ──
const args = process.argv.slice(2);
const getArg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

const lang = getArg('--lang');
const flowPath = getArg('--flow');
const defsPath = getArg('--defs');
const shouldCopy = args.includes('--copy');
const outDir = getArg('--out') || path.resolve(__dirname, 'output', lang || 'csharp');

// ── Validate ──
if (!lang || !['csharp', 'typescript'].includes(lang)) {
  console.error('Usage: node cli/generate.cjs --lang <csharp|typescript> [--flow <path> | --defs <path>]');
  console.error('  --lang   Target language: csharp | typescript');
  console.error('  --flow   Input .flow JSON file');
  console.error('  --defs   Input NodeDefinition[] JSON file');
  console.error('  --out    Output directory');
  console.error('  --copy   Copy runtime framework files to output');
  process.exit(1);
}

if (!flowPath && !defsPath) {
  console.error('ERROR: --flow or --defs required');
  process.exit(1);
}

const gen = lang === 'typescript' ? genTypeScript : genCSharp;

// ── Ensure output dir ──
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// ── Load definitions ──
function loadDefinitions(inputPath) {
  const raw = fs.readFileSync(inputPath, 'utf-8');
  const data = JSON.parse(raw);

  // NodeDefinition[] array
  if (Array.isArray(data) && data.length > 0 && data[0].type && data[0].pins) {
    return { source: 'defs', defs: data, edges: [] };
  }

  // Single object with nodeDefinitions
  if (data.nodeDefinitions && Array.isArray(data.nodeDefinitions)) {
    return { source: 'defs', defs: data.nodeDefinitions, edges: data.edges || [] };
  }

  // .flow file
  if (data.nodes && Array.isArray(data.nodes)) {
    const seen = new Set();
    const defs = [];
    for (const n of data.nodes) {
      if (seen.has(n.type)) continue;
      seen.add(n.type);
      defs.push({
        type: n.type,
        label: n.type,
        category: '',
        color: '#888',
        pins: {
          inputs: [{ id: 'flow_in', label: '', type: 'flow', required: true }],
          outputs: [{ id: 'flow_out', label: '', type: 'flow', required: true }],
        },
        params: Object.entries(n.params || {}).map(([k, v]) => ({
          key: k,
          type: typeof v.value === 'number' ? 'float' : typeof v.value === 'boolean' ? 'boolean' : 'string',
          label: k,
          default: v.value ?? '',
          source: v.source || 'fixed',
          required: false,
        })),
        flowTypes: [],
      });
    }
    return { source: 'flow', defs, edges: data.edges || [] };
  }

  throw new Error(`Unrecognized input format: ${inputPath}`);
}

// ── Validate ──
const { source, defs, edges } = loadDefinitions(flowPath || defsPath);
const errors = [];
for (const def of defs) {
  errors.push(...validate(def));
}
if (errors.length > 0) {
  console.log(`  ⚠ ${errors.length} validation warning(s):`);
  errors.slice(0, 3).forEach(e => console.log(`    - ${e}`));
}

// ── Generate ──
const generated = gen.generateAll(defs, edges, outDir);

console.log(`✅ [${lang}] Generated ${generated.length} file(s) → ${outDir}`);
generated.forEach(f => console.log(`   ${f}`));

if (source === 'flow') {
  console.log(`  ⚠ Generated from .flow file — types may be incomplete. Use --defs for full fidelity.`);
}

// ── Copy runtime ──
if (shouldCopy) {
  const runtimeSrc = path.resolve(__dirname, 'runtime', lang);
  const runtimeDst = path.resolve(outDir, '..'); // parent: output/csharp/
  if (fs.existsSync(runtimeSrc)) {
    copyDir(runtimeSrc, runtimeDst);
    console.log(`📦 Runtime framework copied → ${runtimeDst}`);
  }
}

// ── Helper ──
function copyDir(src, dst) {
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}
