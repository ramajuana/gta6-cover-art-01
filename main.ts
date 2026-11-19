// Neon Coast Cover Studio — the entry program (Node 22, stdlib only).
//
// It hands the app in: copies this repository's app/ and screenshots/ into
// the output directory and writes dossier.json there with the vendored
// make.fun library, so the judge can read the app's source and screenshots.
// The grader runs it twice and both runs must write identical bytes.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from a clean output directory so a stale file can never leak in.
mkdirSync(outputDir, { recursive: true });
for (const child of ['app', 'screenshots', 'dossier.json']) {
  rmSync(join(outputDir, child), { recursive: true, force: true });
}

cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's own caps, from the kit's reference/gate.json: only
// text_max_bytes changes the dossier's bytes; the rest make this program
// fail exactly where the scorer would refuse the entry (more than 4
// screenshots, one over 256 KiB, app/ over 993 entries or 48 MiB, or a path
// under app/ over 1000 bytes).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
