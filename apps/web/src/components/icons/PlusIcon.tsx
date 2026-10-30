import type { SVGProps } from 'react';
const SvgPlusIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 16 16"
    {...props}
  >
    <path
      fill="currentColor"
      d="M14.857 9.143H9.143v5.714a1.143 1.143 0 0 1-2.286 0V9.143H1.143a1.143 1.143 0 0 1 0-2.286h5.714V1.143a1.143 1.143 0 0 1 2.286 0v5.714h5.714a1.143 1.143 0 0 1 0 2.286"
    />
  </svg>
);
export default SvgPlusIcon;
