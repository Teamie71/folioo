import { defineConfig } from 'tsup';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: false,
  esbuildPlugins: [
    vanillaExtractPlugin({
      // 생성되는 클래스 이름 앞에 bud_를 붙여서 출처를 알 수 있게 한다
      identifiers: ({ debugId, hash }) => `bud_${debugId ?? hash}`,
    }),
  ],
});
