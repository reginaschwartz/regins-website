import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const out = join(root, "dist", "webapp");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const item of ["index.html", "css", "js"]) {
  cpSync(join(root, item), join(out, item), { recursive: true });
}

console.log(`built static site -> ${out}`);
