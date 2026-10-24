import { globalStyle, style } from '@vanilla-extract/css';
import { componentLayer } from '@/styles/layers.css';

export const icon = style({
  '@layer': {
    [componentLayer]: {
      display: 'inline-flex',
      flexShrink: 0,

      verticalAlign: 'middle',
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
