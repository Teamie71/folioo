import { createVar, fallbackVar, globalStyle, style } from '@vanilla-extract/css';
import { componentLayer } from '@/styles/layers.css';

// 부모 컴포넌트가 아이콘 스타일을 전달하는 용도
export const iconVars = {
  size: createVar(),
  color: createVar(),
  prefixColor: createVar(),
  suffixColor: createVar(),
};

export const icon = style({
  '@layer': {
    [componentLayer]: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      width: fallbackVar(iconVars.size, '1em'),
      height: fallbackVar(iconVars.size, '1em'),
      color: fallbackVar(iconVars.color, 'currentColor'),
      verticalAlign: 'middle',
    },
  },
});

// SVG 자체의 width·height 대신 공통 아이콘 영역을 채우도록 설정
globalStyle(`${icon} > svg`, {
  '@layer': {
    [componentLayer]: {
      display: 'block',
      width: '100%',
      height: '100%',
    },
  },
});

export const prefixIcon = style([
  icon,
  {
    '@layer': {
      [componentLayer]: {
        color: fallbackVar(iconVars.prefixColor, iconVars.color, 'currentColor'),
      },
    },
  },
]);

export const suffixIcon = style([
  icon,
  {
    '@layer': {
      [componentLayer]: {
        color: fallbackVar(iconVars.suffixColor, iconVars.color, 'currentColor'),
      },
    },
  },
]);
