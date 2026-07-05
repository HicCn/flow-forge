const http = require('http');
const fs = require('fs');
const path = require('path');
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
      const { path: filePath, content } = await readJsonBody(req);
      fs.writeFileSync(filePath, content, 'utf-8');
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
