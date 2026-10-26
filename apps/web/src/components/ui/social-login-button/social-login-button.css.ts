import { recipe } from '@vanilla-extract/recipes';
import { componentLayer } from '@/styles/layers.css';
import { vars } from '@/styles/theme';

export const socialLoginButton = recipe({
  variants: {
    socialType: {
      kakao: {
        '@layer': {
          [componentLayer]: {
            selectors: {
              '&:not(:disabled)': {
                background: vars.color.social.kakao,
                color: vars.color.text.default,
              },
            },
          },
        },
      },
      naver: {
        '@layer': {
          [componentLayer]: {
            selectors: {
              '&:not(:disabled)': {
                background: vars.color.social.naver,
                color: vars.color.text.inverse,
              },
            },
          },
        },
      },
    },
  },
});
