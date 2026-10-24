import { recipe } from '@vanilla-extract/recipes';
import { componentLayer } from '@/styles/layers.css';
import { vars } from '@/styles/theme';

// 현재 토큰 기준: 12 ÷ 2 = 6px
const compactPaddingY = `calc(${vars.spacing.sm} / 2)`;

// 현재 토큰 기준: 24 + 12 = 36px
const standardPaddingX = `calc(${vars.spacing.xl} + ${vars.spacing.sm})`;

export const button = recipe({
  base: {
    '@layer': {
      [componentLayer]: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: vars.spacing.xs,
        padding: vars.spacing.none,
        borderStyle: 'solid',
        borderColor: 'transparent',
        color: vars.color.text.default,
        fontFamily: 'inherit',
        letterSpacing: vars.typography.body.body2.regular.letterSpacing,
        cursor: 'pointer',
        selectors: {
          '&:focus-visible': {
            outline: `2px solid ${vars.color.border.focus}`,
            outlineOffset: 3,
          },
          '&:disabled': {
            cursor: 'not-allowed',
            background: vars.color.bg.unactive,
            borderColor: vars.color.border.button,
            color: vars.color.text.inverse,
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
            borderColor: vars.color.border.primary,
            color: vars.color.text.selected,
            selectors: {
              '&:hover:not(:disabled)': { background: vars.color.bg.secondaryHover },
            },
          },
        },
      },
      gradient: {
        '@layer': {
          [componentLayer]: {
            background: `linear-gradient(180deg, ${vars.color.gradient.top} 0%, ${vars.color.gradient.bottom} 100%)`,
            color: vars.color.text.inverse,
            border: 0,
            selectors: {
              '&:hover:not(:disabled)': {
                background: vars.color.bg.primary,
                boxShadow: `0px 4px 15px 0px ${vars.shadowColor.emphasis}`,
              },
            },
          },
        },
      },
      neutral: {
        '@layer': {
          [componentLayer]: {
            background: vars.color.bg.default,
            borderColor: vars.color.border.button,
            selectors: {
              '&:hover:not(:disabled)': {
                background: vars.color.bg.hover,
              },
            },
          },
        },
      },
      elevate: {
        '@layer': {
          [componentLayer]: {
            background: vars.color.bg.default,
            borderStyle: 'none',
            boxShadow: `0px 0px 4px 0px ${vars.shadowColor.default}`,
            selectors: {
              '&:hover:not(:disabled)': {
                boxShadow: `0px 4px 10px 0px ${vars.shadowColor.default}`,
              },
            },
          },
        },
      },
      text: {
        '@layer': {
          [componentLayer]: {
            background: 'transparent',
            borderStyle: 'none',
          },
        },
      },
      ghost: {
        '@layer': {
          [componentLayer]: {
            background: 'transparent',
            borderStyle: 'none',
            color: vars.color.icon.default,
            selectors: {
              '&:hover:not(:disabled)': {
                color: vars.color.icon.strong,
              },
              '&:disabled': {
                background: 'transparent',
                color: vars.color.text.unactive,
              },
            },
          },
        },
      },
    },
    size: {
      xsmall: {
        '@layer': {
          [componentLayer]: {
            padding: `${compactPaddingY} ${vars.spacing.sm}`,
          },
        },
      },
      small: {
        '@layer': {
          [componentLayer]: {
            padding: `${compactPaddingY} ${vars.spacing.xl}`,
          },
        },
      },
      medium: {
        '@layer': {
          [componentLayer]: {
            padding: `${vars.spacing.xs} ${standardPaddingX}`,
          },
        },
      },
      large: {
        '@layer': {
          [componentLayer]: {
            padding: `${vars.spacing.sm} ${standardPaddingX}`,
          },
        },
      },
      xlarge: {
        '@layer': {
          [componentLayer]: {
            padding: `${vars.spacing.lg} ${vars.spacing['2xl']}`,
          },
        },
      },
      modal: {
        '@layer': {
          [componentLayer]: {
            padding: `${vars.spacing.xs} ${vars.spacing['3xl']}`,
          },
        },
      },
    },
    layout: {
      withText: {},
      iconOnly: {
        '@layer': {
          [componentLayer]: {
            gap: vars.spacing.none,
            borderStyle: 'none',
            flexShrink: 0,
          },
        },
      },
    },
    borderWidth: {
      normal: { '@layer': { [componentLayer]: { borderWidth: 1 } } },
      strong: { '@layer': { [componentLayer]: { borderWidth: 1.5 } } },
    },
    radius: {
      small: { '@layer': { [componentLayer]: { borderRadius: vars.radius.sm } } },
      medium: { '@layer': { [componentLayer]: { borderRadius: vars.radius.md } } },
      full: { '@layer': { [componentLayer]: { borderRadius: vars.radius.full } } },
    },
    textSize: {
      small: {
        '@layer': {
          [componentLayer]: {
            fontSize: vars.typography.caption.caption1.regular.size,
            lineHeight: vars.typography.caption.caption1.regular.lineHeight,
          },
        },
      },
      medium: {
        '@layer': {
          [componentLayer]: {
            fontSize: vars.typography.body.body2.regular.size,
            lineHeight: vars.typography.body.body2.regular.lineHeight,
          },
        },
      },
      large: {
        '@layer': {
          [componentLayer]: {
            fontSize: vars.typography.header.h5.size,
            lineHeight: vars.typography.header.h5.lineHeight,
          },
        },
      },
    },
    fontWeight: {
      regular: {
        '@layer': { [componentLayer]: { fontWeight: vars.typography.body.body2.regular.weight } },
      },
      medium: {
        '@layer': { [componentLayer]: { fontWeight: vars.typography.body.body1.medium.weight } },
      },
      semibold: {
        '@layer': { [componentLayer]: { fontWeight: vars.typography.body.body2.semibold.weight } },
      },
      bold: {
        '@layer': { [componentLayer]: { fontWeight: vars.typography.body.body2.bold.weight } },
      },
    },
    textDecoration: {
      underline: {
        '@layer': {
          [componentLayer]: { textDecoration: 'underline', textUnderlineOffset: '5px' },
        },
      },
      none: {
        '@layer': { [componentLayer]: { textDecoration: 'none' } },
      },
    },
  },
  compoundVariants: [
    {
      variants: { variant: 'text' },
      style: {
        '@layer': {
          [componentLayer]: {
            padding: 0,
          },
        },
      },
    },
  ],
  defaultVariants: {
    variant: 'primary',
    layout: 'withText',
    borderWidth: 'normal',
    radius: 'medium',
    textDecoration: 'none',
    textSize: 'medium',
    fontWeight: 'medium',
  },
});
