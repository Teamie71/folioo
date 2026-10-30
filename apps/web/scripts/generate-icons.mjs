import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const webDirectory = new URL('../', import.meta.url);
const generatedDirectory = new URL('src/assets/icons/generated/', webDirectory);

rmSync(generatedDirectory, { recursive: true, force: true });

execFileSync(
  process.execPath,
  [
    require.resolve('@svgr/cli/bin/svgr'),
    '--config-file',
    '.svgrrc.json',
    '--out-dir',
    'src/assets/icons/generated',
    '--',
    'src/assets/icons/svg',
  ],
  { cwd: webDirectory, stdio: 'inherit' },
);
