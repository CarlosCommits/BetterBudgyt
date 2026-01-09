#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'manifest.json');
const PACKAGE_PATH = path.join(ROOT_DIR, 'package.json');

function run(cmd) {
  console.log(`\x1b[90m$ ${cmd}\x1b[0m`);
  execSync(cmd, { cwd: ROOT_DIR, stdio: 'inherit' });
}

function bumpVersion(current, type) {
  const parts = current.split('.').map(Number);
  
  while (parts.length < 3) parts.push(0);
  
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
      break;
  }
  
  return parts.join('.');
}

function release(type) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
  
  const oldVersion = manifest.version;
  const newVersion = bumpVersion(oldVersion, type);
  
  console.log(`\n\x1b[36mBumping version: ${oldVersion} → ${newVersion}\x1b[0m\n`);
  
  manifest.version = newVersion;
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  
  pkg.version = newVersion;
  fs.writeFileSync(PACKAGE_PATH, JSON.stringify(pkg, null, 2) + '\n');
  
  console.log('\x1b[36mCommitting and tagging...\x1b[0m\n');
  
  run('git add manifest.json package.json');
  run(`git commit -m "Release v${newVersion}"`);
  run(`git tag v${newVersion}`);
  
  console.log('\n\x1b[36mPushing to remote...\x1b[0m\n');
  
  run('git push');
  run('git push --tags');
  
  console.log(`\n\x1b[32mReleased v${newVersion}!\x1b[0m`);
  console.log('\x1b[90mGitHub Actions will now build and publish to Chrome Web Store.\x1b[0m\n');
}

const type = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(type)) {
  console.error(`\x1b[31mInvalid release type: ${type}\x1b[0m`);
  console.error('Usage: node scripts/release.js [patch|minor|major]');
  process.exit(1);
}

release(type);
