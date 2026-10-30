import type { SVGProps } from 'react';
const SvgNaverIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={18}
    height={18}
    fill="none"
    viewBox="0 0 18 18"
    {...props}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M12.205 9.635 5.53 0H0v18h5.796V8.368L12.469 18H18V0h-5.796z"
      clipRule="evenodd"
    />
  </svg>
);
export default SvgNaverIcon;
