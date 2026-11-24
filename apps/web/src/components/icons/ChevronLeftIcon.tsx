import type { SVGProps } from 'react';
const SvgChevronLeftIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={28}
    height={28}
    fill='none'
    viewBox='0 0 28 28'
    {...props}
  >
    <path
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2.5}
      d='m18 23-9-9 9-9'
    />
  </svg>
);
export default SvgChevronLeftIcon;
