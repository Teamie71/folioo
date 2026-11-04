import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';
import type { StorybookConfig } from '@storybook/nextjs-vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.tsx'],
  framework: '@storybook/nextjs-vite',
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
  // VE의 Node 평가 경로에서도 웹 소스 alias를 해석할 수 있어야 한다.
  viteFinal: async (config) =>
    mergeConfig(config, {
      resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
      plugins: [vanillaExtractPlugin()],
      optimizeDeps: { include: ['@vanilla-extract/recipes/createRuntimeFn'] },
    }),
};
export default config;
