import { globalStyle, style } from '@vanilla-extract/css';
import { componentLayer } from '@/styles/layers.css';

// 사용하는 쪽에서 전달한 색상을 받는 컴포넌트 내부 CSS 변수입니다.
export const iconColorVar = '--folioo-icon-color';

export const icon = style({
  '@layer': {
    [componentLayer]: {
      display: 'inline-flex',
      color: `var(${iconColorVar}, inherit)`,
      flexShrink: 0,
      verticalAlign: 'middle',
      selectors: {
        'button:disabled &': {
          color: 'inherit',
        },
      },
    },
  },
});

globalStyle(`${icon} > svg`, {
  '@layer': {
    [componentLayer]: {
      display: 'block',
      width: '100%',
      height: '100%',
    },
  },
});
