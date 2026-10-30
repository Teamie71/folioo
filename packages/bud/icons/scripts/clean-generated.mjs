import { rmSync } from 'node:fs';

const generatedDirectory = new URL('../src/generated/', import.meta.url);

rmSync(generatedDirectory, { recursive: true, force: true });
