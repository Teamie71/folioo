import type { ComponentProps, ReactElement, SVGProps } from 'react';
import * as styles from './icon.css';

export type IconProps = Omit<ComponentProps<'span'>, 'children' | 'dangerouslySetInnerHTML'> & {
  svg: ReactElement<SVGProps<SVGSVGElement>>;
  /** 아이콘 영역의 너비와 높이(px). 생략하면 부모의 크기 설정을 따릅니다. */
  size?: number;
};

// 세 컴포넌트가 공유하는 렌더링
function renderIcon({ svg, size, className, style, ...props }: IconProps, iconClassName: string) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={[iconClassName, className].filter(Boolean).join(' ')}
      style={size === undefined ? style : { ...style, width: size, height: size }}
    >
      {svg}
    </span>
  );
}

export function Icon(props: IconProps) {
  return renderIcon(props, styles.icon);
}

export function PrefixIcon(props: IconProps) {
  return renderIcon(props, styles.prefixIcon);
}

export function SuffixIcon(props: IconProps) {
  return renderIcon(props, styles.suffixIcon);
}
