#!/usr/bin/env node
/* tools/validate-html.js — parses every HTML file in the repo with Python's
 * html.parser (same method used manually throughout this project) and
 * reports any file that fails to parse. Usage: node tools/validate-html.js */
'use strict';
const path = require('path');
const { listHtmlFiles, validateHtmlFile, REPO_ROOT } = require('./lib');

let failures = 0;
const files = listHtmlFiles();
for (const file of files) {
  const result = validateHtmlFile(file);
  if (!result.ok) {
    failures++;
    console.log(`FAIL ${path.relative(REPO_ROOT, file)}: ${result.error}`);
  }
}
console.log(`\n${files.length - failures}/${files.length} files parsed cleanly.`);
process.exit(failures ? 1 : 0);
