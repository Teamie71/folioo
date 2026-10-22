import type { ComponentProps } from 'react';
import type { RecipeVariants } from '@vanilla-extract/recipes';
import { button } from './button.css';

export type ButtonProps = ComponentProps<'button'> & RecipeVariants<typeof button>;

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={[button({ variant, size }), className].filter(Boolean).join(' ')}
    />
  );
}
