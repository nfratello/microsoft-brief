/* tools/lib.js — shared helpers for the Brief repo's tools/ scripts.
 * No external dependencies except playwright-core (already installed via
 * `npm install --no-save playwright-core`, reuses the machine's existing
 * Edge install via channel:'msedge' — no browser download needed). */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

const SKIP_DIRS = new Set(['.git', 'node_modules', 'tools']);

/** List every .html file in the repo (excludes .git, node_modules, tools/screenshots). */
function listHtmlFiles(root = REPO_ROOT) {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        out.push(full);
      }
    }
  })(root);
  return out;
}

/** Strip <script>, <style> blocks and all tags, leaving visible text with line numbers preserved. */
function visibleTextLines(html) {
  const noScriptStyle = html
    .replace(/<script[\s\S]*?<\/script>/gi, (m) => m.replace(/[^\n]/g, ''))
    .replace(/<style[\s\S]*?<\/style>/gi, (m) => m.replace(/[^\n]/g, ''));
  const noTags = noScriptStyle.replace(/<[^>]*>/g, (m) => m.replace(/[^\n]/g, ' '));
  return noTags.split('\n');
}

/** Run a short Python snippet (python's html.parser) to validate one file's HTML. Returns {ok, error}. */
function validateHtmlFile(file) {
  const script = `
import html.parser, sys
class P(html.parser.HTMLParser):
    def error(self, msg):
        raise Exception(msg)
content = open(r"${file.replace(/\\/g, '\\\\')}", encoding="utf-8").read()
p = P()
p.feed(content)
`;
  try {
    execFileSync('python', ['-c', script], { stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e.stderr || e.message || String(e)).toString().trim() };
  }
}

/** Minimal static file server for screenshots/orphan-check (serves REPO_ROOT). */
function startStaticServer(root = REPO_ROOT, port = 0) {
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const full = path.join(root, urlPath);
    if (!full.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.readFile(full, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      const ext = path.extname(full);
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function launchBrowser() {
  const { chromium } = require('playwright-core');
  return chromium.launch({ channel: 'msedge' });
}

module.exports = { REPO_ROOT, listHtmlFiles, visibleTextLines, validateHtmlFile, startStaticServer, launchBrowser };
