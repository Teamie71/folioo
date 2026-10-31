import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    '**/node_modules/**',
    '**/.venv/**',
    '**/dist/**',
    '**/.next/**',
    '**/.turbo/**',
    '**/coverage/**',
    // 웹은 자체 Next.js 설정과 web job에서 린트합니다.
    'apps/web/**',
    // 서버는 자체 ESLint 설정과 api job에서 린트합니다.
    'apps/server/**',
    'packages/bud/tokens/src/tokens/**',
    'packages/bud/tokens/scripts/generate-tokens.mjs',
  ]),
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
);
