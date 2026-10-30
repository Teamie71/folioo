import type { SVGProps } from 'react';
const SvgKakaoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    viewBox="0 0 20 20"
    {...props}
  >
    <g clipPath="url(#kakao-icon_svg__a)">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10 .667C4.477.667 0 4.126 0 8.392c0 2.653 1.732 4.991 4.368 6.383l-1.11 4.052c-.097.358.312.644.627.436l4.863-3.21q.615.061 1.252.063c5.523 0 10-3.458 10-7.724S15.523.667 10 .667"
        clipRule="evenodd"
      />
    </g>
    <defs>
      <clipPath id="kakao-icon_svg__a">
        <path fill="#fff" d="M0 0h20v20H0z" />
      </clipPath>
    </defs>
  </svg>
);
export default SvgKakaoIcon;
