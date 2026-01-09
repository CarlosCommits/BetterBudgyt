#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const ROOT_DIR = path.join(__dirname, '..');
const EXTENSION_NAME = 'BetterBudgyt';

const INCLUDES = [
  'manifest.json',
  'content.js',
  'popup.html',
  'popup.js',
  'styles.css',
  'images',
  'modules',
  'lib'
];

async function build() {
  const manifestPath = path.join(ROOT_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const version = manifest.version;

  const outputFile = path.join(ROOT_DIR, `${EXTENSION_NAME}-v${version}.zip`);

  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
    console.log(`Removed old: ${path.basename(outputFile)}`);
  }

  const output = fs.createWriteStream(outputFile);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(1);
      console.log('');
      console.log('\x1b[32mBuild complete!\x1b[0m');
      console.log(`  Output: ${path.basename(outputFile)}`);
      console.log(`  Size: ${sizeKB} KB`);
      console.log('');
      resolve(outputFile);
    });

    archive.on('error', reject);

    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') {
        console.warn('Warning:', err.message);
      }
    });

    archive.pipe(output);

    for (const item of INCLUDES) {
      const itemPath = path.join(ROOT_DIR, item);
      if (!fs.existsSync(itemPath)) {
        console.warn(`\x1b[33mWarning: Missing ${item}\x1b[0m`);
        continue;
      }

      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        archive.directory(itemPath, item);
      } else {
        archive.file(itemPath, { name: item });
      }
    }

    archive.finalize();
  });
}

if (require.main === module) {
  build().catch((err) => {
    console.error('\x1b[31mBuild failed:\x1b[0m', err.message);
    process.exit(1);
  });
}

module.exports = { build };
