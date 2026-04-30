/**
 * @react-native-menu/menu 1.2.x: Kotlin uses `view.overflow = overflow`, which fails on
 * React Native 0.79+ (`overflow` is not assignable). Call `setOverflow` instead.
 * Idempotent: skips if the assignment is already gone or paths are missing (e.g. partial install).
 */
const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "@react-native-menu",
  "menu",
  "android",
  "src",
  "main",
  "java",
  "com",
  "reactnativemenu",
  "MenuViewManagerBase.kt",
);

if (!fs.existsSync(target)) {
  process.exit(0);
}

let src = fs.readFileSync(target, "utf8");
const needle = "view.overflow = overflow";
if (!src.includes(needle)) {
  process.exit(0);
}

src = src.replace(
  /(\s+)view\.overflow = overflow/,
  "$1view.setOverflow(overflow)",
);
fs.writeFileSync(target, src);
