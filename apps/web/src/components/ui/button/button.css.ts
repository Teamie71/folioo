import { recipe } from '@vanilla-extract/recipes';
import { componentLayer } from '@/styles/layers.css';
import { vars } from '@/styles/theme';

export const button = recipe({
  base: {
    '@layer': {
      [componentLayer]: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: vars.spacing.xs,
        border: '1px solid transparent',
        borderRadius: vars.radius.md,
        font: 'inherit',
        cursor: 'pointer',
        selectors: {
          '&:focus-visible': {
            outline: `2px solid ${vars.color.border.focus}`,
            outlineOffset: 3,
          },
          '&:disabled': {
            cursor: 'not-allowed',
            background: vars.color.bg.unactive,
            color: vars.color.text.default,
          },
        },
      },
    },
  },
  variants: {
    variant: {
      primary: {
        '@layer': {
          [componentLayer]: {
            background: vars.color.bg.primary,
            color: vars.color.text.inverse,
            selectors: { '&:hover:not(:disabled)': { background: vars.color.bg.primaryHover } },
          },
        },
      },
      secondary: {
        '@layer': {
          [componentLayer]: {
            background: vars.color.bg.secondary,
            color: vars.color.text.default,
            selectors: { '&:hover:not(:disabled)': { background: vars.color.bg.secondaryHover } },
          },
        },
      },
    },
    size: {
      sm: { '@layer': { [componentLayer]: { padding: `${vars.spacing.xs} ${vars.spacing.sm}` } } },
      md: { '@layer': { [componentLayer]: { padding: `${vars.spacing.sm} ${vars.spacing.md}` } } },
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});
