import type { ComponentProps } from 'react';
import type { RecipeVariants } from '@vanilla-extract/recipes';
import { button } from './button.css';

type IconOnlyProps = {
  layout: 'iconOnly';
} & (
  | { 'aria-label': string; 'aria-labelledby'?: string }
  | { 'aria-label'?: string; 'aria-labelledby': string }
);

export type ButtonProps = ComponentProps<'button'> &
  RecipeVariants<typeof button> &
  ({ layout?: 'withText' } | IconOnlyProps);

export function Button({
  variant,
  size,
  layout,
  borderWidth,
  radius,
  textSize,
  fontWeight,
  textDecoration,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={[
        button({
          variant,
          size: size ?? (layout === 'iconOnly' ? undefined : 'large'),
          layout,
          borderWidth,
          radius,
          textSize,
          textDecoration,
          fontWeight,
        }),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
