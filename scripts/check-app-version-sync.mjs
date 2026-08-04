#!/usr/bin/env node
/**
 * Guardrail: in-app / native version sources must stay aligned with app.json,
 * and Profile must never hardcode a marketing version.
 *
 *   bun run version:check
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

const appJson = JSON.parse(readFileSync(resolve(root, 'app.json'), 'utf8'));
const version = appJson?.expo?.version;
const buildNumber = appJson?.expo?.ios?.buildNumber;

if (typeof version !== 'string' || !version.trim()) {
  errors.push('app.json missing expo.version');
}
if (typeof buildNumber !== 'string' || !buildNumber.trim()) {
  errors.push('app.json missing expo.ios.buildNumber');
}

const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
if (packageJson.version !== version) {
  errors.push(
    `package.json version (${packageJson.version}) != app.json expo.version (${version})`,
  );
}

const infoPlist = readFileSync(resolve(root, 'ios/SakeScan/Info.plist'), 'utf8');
const shortMatch = infoPlist.match(
  /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]*)<\/string>/,
);
const buildMatch = infoPlist.match(
  /<key>CFBundleVersion<\/key>\s*<string>([^<]*)<\/string>/,
);
if (!shortMatch || shortMatch[1] !== version) {
  errors.push(
    `Info.plist CFBundleShortVersionString (${shortMatch?.[1] ?? 'missing'}) != ${version}`,
  );
}
if (!buildMatch || buildMatch[1] !== buildNumber) {
  errors.push(
    `Info.plist CFBundleVersion (${buildMatch?.[1] ?? 'missing'}) != ${buildNumber}`,
  );
}

const pbxproj = readFileSync(
  resolve(root, 'ios/SakeScan.xcodeproj/project.pbxproj'),
  'utf8',
);
const marketing = [...pbxproj.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map(
  (m) => m[1],
);
const current = [...pbxproj.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map(
  (m) => m[1],
);
if (marketing.length === 0 || marketing.some((v) => v !== version)) {
  errors.push(
    `project.pbxproj MARKETING_VERSION values [${marketing.join(', ')}] must all be ${version}`,
  );
}
if (current.length === 0 || current.some((v) => v !== buildNumber)) {
  errors.push(
    `project.pbxproj CURRENT_PROJECT_VERSION values [${current.join(', ')}] must all be ${buildNumber}`,
  );
}

const profilePath = resolve(root, 'src/app/profile.tsx');
const profileSrc = readFileSync(profilePath, 'utf8');
if (!profileSrc.includes('getAppVersionLabel(')) {
  errors.push('src/app/profile.tsx must call getAppVersionLabel() for the footer version');
}
if (/SakeScan v\d+\.\d+\.\d+/.test(profileSrc)) {
  errors.push(
    'src/app/profile.tsx hardcodes a SakeScan version string — use getAppVersionLabel()',
  );
}

// Broader scan: no hardcoded "SakeScan vX.Y.Z" in app UI sources
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(extname(name))) out.push(p);
  }
  return out;
}

for (const file of walk(resolve(root, 'src'))) {
  const text = readFileSync(file, 'utf8');
  if (/SakeScan v\d+\.\d+\.\d+/.test(text) && !file.endsWith('app-version.ts')) {
    // allow comments mentioning examples only inside app-version.ts
    errors.push(`${file.replace(root + '/', '')} hardcodes a SakeScan version string`);
  }
}

if (!readFileSync(resolve(root, 'src/lib/app-version.ts'), 'utf8').includes('nativeApplicationVersion')) {
  errors.push('src/lib/app-version.ts must read Application.nativeApplicationVersion for store builds');
}

if (errors.length) {
  console.error('App version sync check failed:\n');
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nFix with: bun run version:sync');
  console.error('And always display versions via getAppVersionLabel() from src/lib/app-version.ts');
  process.exit(1);
}

console.log(`OK: in-app/native versions synced at ${version} (${buildNumber})`);
