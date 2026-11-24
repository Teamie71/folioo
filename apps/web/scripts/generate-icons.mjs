import { execFileSync } from 'node:child_process';
import { mkdtempSync, renameSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const webDirectory = new URL('../', import.meta.url);
const generatedDirectory = new URL('src/components/icons/', webDirectory);
const svgrPath = require.resolve('@svgr/cli/bin/svgr');
const prettierPath = require.resolve('prettier/bin/prettier.cjs');
const temporaryDirectory = mkdtempSync(
  new URL('src/components/.icons-', webDirectory),
);

try {
  execFileSync(
    process.execPath,
    [
      svgrPath,
      '--config-file',
      '.svgrrc.json',
      '--no-prettier',
      '--out-dir',
      temporaryDirectory,
      '--',
      'public/icons',
    ],
    { cwd: webDirectory, stdio: 'inherit' },
  );

  execFileSync(
    process.execPath,
    [
      prettierPath,
      '--config',
      '.prettierrc.json',
      '--write',
      temporaryDirectory,
    ],
    { cwd: webDirectory, stdio: 'inherit' },
  );

  rmSync(generatedDirectory, { recursive: true, force: true });
  renameSync(temporaryDirectory, generatedDirectory);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
