import { style } from '@vanilla-extract/css';
import { componentLayer } from '@/styles/layers.css';
import { vars } from '@/styles/theme';

export const surface = style({
  '@layer': {
    [componentLayer]: {
      backgroundColor: vars.color.bg.default,
      color: vars.color.text.default,
    },
  },
});

export const contactLink = style({
  '@layer': {
    [componentLayer]: {
      color: vars.color.text.link,
      textDecoration: 'underline',
      textDecorationSkipInk: 'none',
      textUnderlineOffset: '0.3125rem',
    },
  },
});

export const desktopButton = style({
  '@layer': {
    [componentLayer]: {
      boxShadow: `0 0 0.25rem ${vars.shadowColor.default}`,
    },
  },
});
