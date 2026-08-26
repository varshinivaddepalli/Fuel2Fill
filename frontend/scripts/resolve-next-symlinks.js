/**
 * resolve-next-symlinks.js
 *
 * Workaround for AWS Amplify + Next.js 16.1 (Turbopack) build issue.
 * Turbopack creates hashed symlinks in .next/node_modules/ that Amplify's
 * bundler cannot follow. This script replaces each symlink with a real copy
 * of the target directory (including transitive node_modules).
 *
 * Runs automatically via the "postbuild" npm script after `npm run build`.
 *
 * See: https://github.com/aws-amplify/amplify-hosting/issues/4074
 */

const fs = require("fs");
const path = require("path");

const NEXT_NODE_MODULES = path.join(__dirname, "..", ".next", "node_modules");
const MAX_DEPTH = 20;

function copyDirSync(src, dest, depth = 0) {
  if (depth > MAX_DEPTH) {
    throw new Error(`Max copy depth exceeded at: ${src}`);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, depth + 1);
    } else if (entry.isSymbolicLink()) {
      const target = fs.realpathSync(srcPath);
      if (fs.statSync(target).isDirectory()) {
        copyDirSync(target, destPath, depth + 1);
      } else {
        fs.copyFileSync(target, destPath);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  if (!fs.existsSync(NEXT_NODE_MODULES)) {
    console.log("[resolve-symlinks] No .next/node_modules/ found — nothing to do.");
    process.exit(0);
  }

  const entries = fs.readdirSync(NEXT_NODE_MODULES, { withFileTypes: true });
  let resolved = 0;
  let errors = 0;

  for (const entry of entries) {
    const fullPath = path.join(NEXT_NODE_MODULES, entry.name);

    if (!entry.isSymbolicLink()) continue;

    try {
      const target = fs.realpathSync(fullPath);
      const stat = fs.statSync(target);

      fs.rmSync(fullPath, { recursive: true, force: true });

      if (stat.isDirectory()) {
        copyDirSync(target, fullPath);
      } else {
        fs.copyFileSync(target, fullPath);
      }

      resolved++;
      console.log(`[resolve-symlinks] ${entry.name} -> ${target}`);
    } catch (err) {
      errors++;
      console.error(`[resolve-symlinks] ERROR resolving ${entry.name}: ${err.message}`);
    }
  }

  console.log(`[resolve-symlinks] Done: ${resolved} resolved, ${errors} error(s).`);
  if (errors > 0) {
    process.exit(1);
  }
}

main();
