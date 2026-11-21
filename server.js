const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3899;
const PUBLIC_DIR = path.join(__dirname, 'public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDirsAndAssets() {
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const assetMappings = [
    {
      src: 'C:\\Users\\Admin\\AppData\\Local\\TerminalBoard\\captures\\20261119-174718-655-dd4d23.png',
      dest: path.join(ASSETS_DIR, 'logo-np-one-3d.png')
    },
    {
      src: 'C:\\Users\\Admin\\AppData\\Local\\TerminalBoard\\captures\\20261119-174712-422-2801b9.png',
      dest: path.join(ASSETS_DIR, 'logo-np-one-flat.png')
    },
    {
      src: 'C:\\Users\\Admin\\AppData\\Local\\TerminalBoard\\captures\\20261119-174655-752-98462e.png',
      dest: path.join(ASSETS_DIR, 'sample-selfie-worker.png')
    }
  ];

  for (const item of assetMappings) {
    try {
      if (fs.existsSync(item.src) && !fs.existsSync(item.dest)) {
        fs.copyFileSync(item.src, item.dest);
      }
    } catch (err) {
      console.warn('Could not copy asset:', item.src, err.message);
    }
  }
}

ensureDirsAndAssets();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API endpoints for saving/loading persistent state
  if (pathname === '/api/state' && req.method === 'GET') {
    if (fs.existsSync(DB_FILE)) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(fs.readFileSync(DB_FILE, 'utf8'));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ empty: true }));
    }
    return;
  }

  if (pathname === '/api/state' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        fs.writeFileSync(DB_FILE, body, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (pathname === '/api/reset' && req.method === 'POST') {
    try {
      if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // Static files
  let safePath = path.normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`NP ONE HR Server running at http://localhost:${PORT}`);
});
