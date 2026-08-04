#!/usr/bin/env node
/**
 * Keep native iOS version fields aligned with app.json.
 * Run after bumping expo.version / expo.ios.buildNumber (including EAS autoIncrement).
 *
 *   bun run version:sync
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appJsonPath = resolve(root, 'app.json');
const infoPlistPath = resolve(root, 'ios/SakeScan/Info.plist');
const pbxprojPath = resolve(root, 'ios/SakeScan.xcodeproj/project.pbxproj');
const packageJsonPath = resolve(root, 'package.json');

const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
const version = appJson?.expo?.version;
const buildNumber = appJson?.expo?.ios?.buildNumber;

if (typeof version !== 'string' || !version.trim()) {
  console.error('Missing expo.version in app.json');
  process.exit(1);
}
if (typeof buildNumber !== 'string' || !buildNumber.trim()) {
  console.error('Missing expo.ios.buildNumber in app.json');
  process.exit(1);
}

function replacePlistString(plist, key, value) {
  const pattern = new RegExp(
    `(<key>${key}</key>\\s*<string>)([^<]*)(</string>)`,
  );
  if (!pattern.test(plist)) {
    throw new Error(`Could not find ${key} in Info.plist`);
  }
  return plist.replace(pattern, `$1${value}$3`);
}

let infoPlist = readFileSync(infoPlistPath, 'utf8');
infoPlist = replacePlistString(infoPlist, 'CFBundleShortVersionString', version);
infoPlist = replacePlistString(infoPlist, 'CFBundleVersion', buildNumber);
writeFileSync(infoPlistPath, infoPlist);

let pbxproj = readFileSync(pbxprojPath, 'utf8');
pbxproj = pbxproj.replace(
  /MARKETING_VERSION = [^;]+;/g,
  `MARKETING_VERSION = ${version};`,
);
pbxproj = pbxproj.replace(
  /CURRENT_PROJECT_VERSION = [^;]+;/g,
  `CURRENT_PROJECT_VERSION = ${buildNumber};`,
);
writeFileSync(pbxprojPath, pbxproj);

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
if (packageJson.version !== version) {
  packageJson.version = version;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

console.log(`Synced iOS + package.json to ${version} (${buildNumber})`);
