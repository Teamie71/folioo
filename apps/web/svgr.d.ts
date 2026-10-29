declare module '*.svg' {
  import type { FC, SVGProps } from 'react';

  const SvgComponent: FC<SVGProps<SVGSVGElement>>;
  export default SvgComponent;
}

declare module '*.svg?url' {
  import type { StaticImageData } from 'next/image';

  const image: StaticImageData;
  export default image;
}
