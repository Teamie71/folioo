import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    'storybook-static/**',
    '.next/**',
    'next-env.d.ts',
    'node_modules/**',
    'src/components/icons/**',
  ]),
]);
