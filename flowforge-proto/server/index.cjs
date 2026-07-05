const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const PORT = 3001;
const PROJECT_DIR = path.resolve(__dirname, '..');

function corsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, data) {
  corsHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    corsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === 'POST' && req.url === '/api/save') {
      const { path: filePath, content, meta } = await readJsonBody(req);
      fs.writeFileSync(filePath, content, 'utf-8');
      if (meta) {
        const metaPath = filePath + '.meta';
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
      }
      sendJson(res, 200, { ok: true, path: filePath });
    } else if (req.method === 'POST' && req.url === '/api/save-as') {
      const { content } = await readJsonBody(req);
      const defaultName = 'untitled.flow';
      const filePath = path.join(PROJECT_DIR, defaultName);
      fs.writeFileSync(filePath, content, 'utf-8');
      sendJson(res, 200, { ok: true, path: filePath });
    } else if (req.method === 'POST' && req.url === '/api/open') {
      const samplePath = path.join(__dirname, 'sample.flow.json');
      if (fs.existsSync(samplePath)) {
        const content = fs.readFileSync(samplePath, 'utf-8');
        sendJson(res, 200, { content, path: samplePath });
      } else {
        sendJson(res, 200, { content: null, path: null });
      }
    } else if (req.method === 'GET' && req.url === '/api/list-samples') {
      const files = fs.readdirSync(PROJECT_DIR).filter((f) => f.endsWith('.flow'));
      sendJson(res, 200, { files });
    } else if (req.method === 'POST' && req.url === '/api/load') {
      const { path: filePath } = await readJsonBody(req);
      if (filePath && fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const metaPath = filePath + '.meta';
        const meta = fs.existsSync(metaPath)
          ? JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
          : null;
        sendJson(res, 200, { content, meta });
      } else {
        sendJson(res, 200, { content: null, meta: null });
      }
    } else if (req.method === 'POST' && req.url === '/api/export-runtime') {
      const { lang, nodeDefs, flowData } = await readJsonBody(req);

      // Write defs to temp file
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowforge-export-'));
      const defsPath = path.join(tmpDir, 'defs.json');
      fs.writeFileSync(defsPath, JSON.stringify(nodeDefs ?? []), 'utf-8');

      // Determine output dir
      const outDir = path.join(tmpDir, 'out');
      fs.mkdirSync(outDir, { recursive: true });

      // Run the CLI generator
      const cliPath = path.resolve(__dirname, '..', 'cli', 'generate.cjs');
      const langArg = lang === 'typescript' ? 'typescript' : 'csharp';
      try {
        const cmd = `node "${cliPath}" --lang ${langArg} --defs "${defsPath}" --out "${outDir}"`;
        execSync(cmd, { encoding: 'utf-8', timeout: 10000 });

        // Read generated files
        const files = [];
        if (fs.existsSync(outDir)) {
          for (const f of fs.readdirSync(outDir)) {
            files.push({
              name: f,
              content: fs.readFileSync(path.join(outDir, f), 'utf-8'),
            });
          }
        }

        // Cleanup
        fs.rmSync(tmpDir, { recursive: true, force: true });
        sendJson(res, 200, { files });
      } catch (err) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        sendJson(res, 500, { error: err.message || String(err) });
      }
    } else {
      sendJson(res, 404, { error: 'Not found' });
    }
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`FlowForge backend running at http://localhost:${PORT}`);
  console.log(`Serving from: ${PROJECT_DIR}`);
});
