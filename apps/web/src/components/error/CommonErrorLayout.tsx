'use client';

import { text, vars } from '@folioo/bud-tokens';
import { useRouter } from 'next/navigation';
import { BlurredLogoIcon } from '@/components/icons';

import { Icon } from '@/components/ui/icon';
import * as styles from './CommonErrorLayout.css';

type CommonErrorLayoutProps = {
  isMobile: boolean;
};

export default function CommonErrorLayout({
  isMobile,
}: CommonErrorLayoutProps) {
  const titleText = isMobile ? text.header.h4 : text.display;
  const descriptionText = isMobile
    ? text.caption.caption1.regular
    : text.body.body1.regular;
  const titleMargin = isMobile ? 'mt-[1.25rem]' : 'mt-[3.75rem]';
  const descriptionMargin = isMobile ? 'mt-[1.25rem]' : 'mt-[2.5rem]';
  const bottomPadding = isMobile ? 'pb-[2rem]' : 'pb-[3.125rem]';

  return (
    <div
      className={`${styles.surface} flex min-h-[100dvh] flex-col items-center justify-center px-[1rem] ${bottomPadding}`}
    >
      <div className='flex w-full max-w-[32.9375rem] flex-col items-center text-center'>
        <Icon
          svg={<BlurredLogoIcon />}
          color={vars.color.icon.primary}
          size={isMobile ? 80 : 150}
        />

        <div className={`${titleText} max-w-full ${titleMargin}`}>
          <h1>앗, 페이지를 찾을 수 없어요.</h1>
        </div>

        <p className={`${descriptionText} ${descriptionMargin}`}>
          잠시 후 다시 시도하거나, 메인 페이지로 이동해 주세요.
          <br />
          문제가 계속될 경우
          {isMobile ? <br /> : ' '}
          <a href='mailto:teamie0701@gmail.com' className={styles.contactLink}>
            teamie0701@gmail.com
          </a>
          으로 문의해 주세요.
        </p>
      </div>
    </div>
  );
}
