import type { ComponentProps, ReactElement, SVGProps } from 'react';
import { icon } from './icon.css';

export type IconProps = Omit<ComponentProps<'span'>, 'children'> & {
  svg: ReactElement<SVGProps<SVGSVGElement>>;
  size?: number;
};

export function Icon({ svg, size, className, style, ...props }: IconProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={[icon, className].filter(Boolean).join(' ')}
      style={size === undefined ? style : { ...style, width: size, height: size }}
    >
      {svg}
    </span>
  );
}

export { Icon as PrefixIcon, Icon as SuffixIcon };
