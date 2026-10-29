import type { ComponentProps, CSSProperties, ReactElement, SVGProps } from 'react';
import type { vars } from '@/styles/theme';
import { icon, iconColorVar } from './icon.css';

export type IconProps = Omit<ComponentProps<'span'>, 'children' | 'color'> & {
  svg: ReactElement<SVGProps<SVGSVGElement>>;
  size?: number;
  color?: (typeof vars.color.icon)[keyof typeof vars.color.icon];
};

export function Icon({ svg, size, color, className, style, ...props }: IconProps) {
  const hasAccessibleName = Boolean(
    props['aria-label']?.trim() || props['aria-labelledby']?.trim(),
  );
  const iconStyle: CSSProperties & { [iconColorVar]?: IconProps['color'] } = {
    ...style,
    ...(size === undefined ? {} : { width: size, height: size }),
    [iconColorVar]: color,
  };

  return (
    <span
      {...props}
      aria-hidden={props['aria-hidden'] ?? !hasAccessibleName}
      role={props.role ?? (hasAccessibleName ? 'img' : undefined)}
      className={[icon, className].filter(Boolean).join(' ')}
      style={iconStyle}
    >
      {svg}
    </span>
  );
}

export { Icon as PrefixIcon, Icon as SuffixIcon };
