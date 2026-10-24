import type { NextConfig } from 'next';
import { createVanillaExtractPlugin } from '@vanilla-extract/next-plugin';

const withVanillaExtract = createVanillaExtractPlugin();
const nextConfig: NextConfig = {
  webpack(config) {
    const imageRule = config.module.rules.find(
      (rule: { loader?: string }) => rule?.loader === 'next-image-loader',
    );

    if (!imageRule) {
      throw new Error('SVGR 설정에 필요한 Next.js 이미지 로더를 찾을 수 없습니다.');
    }

    config.module.rules.push(
      // SVG 이미지는 기존 Next.js 이미지 로더로 처리합니다.
      { ...imageRule, test: /\.svg$/i, resourceQuery: /url/ },
      // 일반 SVG import는 React 컴포넌트로 변환합니다.
      {
        test: /\.svg$/i,
        issuer: imageRule.issuer,
        dependency: imageRule.dependency,
        resourceQuery: { not: [...imageRule.resourceQuery.not, /url/] },
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              svgoConfig: {
                plugins: [
                  {
                    name: 'preset-default',
                    params: {
                      // CSS로 SVG 크기를 바꿔도 도형이 함께 확대되도록 보존합니다.
                      overrides: { removeViewBox: false },
                    },
                  },
                  'prefixIds',
                ],
              },
            },
          },
        ],
      },
    );

    imageRule.exclude = /\.svg$/i;

    return config;
  },
};

export default withVanillaExtract(nextConfig);
