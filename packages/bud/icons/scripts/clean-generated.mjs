import { rmSync } from 'node:fs';

const generatedDirectory = new URL('../src/icons/', import.meta.url);

rmSync(generatedDirectory, { recursive: true, force: true });
