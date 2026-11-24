'use client';

import { Button } from '@/components/ui/button';
import { text } from '@folioo/bud-tokens';
import { useRouter } from 'next/navigation';

export default function MobileBlockedPage() {
  const router = useRouter();

  return (
    <div className='flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-white px-[2rem] py-[2rem]'>
      <div className='flex flex-col items-center gap-[2.5rem] text-center'>
        <p className={text.body.body2.regular}>
          모바일 환경을 지원하지 않는 페이지예요.
          <br />
          PC로 접속하여 진행해주세요.
        </p>

        <Button
          variant='primary'
          textSize='medium'
          fontWeight='bold'
          radius='full'
          onClick={() => router.back()}
        >
          이전 페이지로
        </Button>
      </div>
    </div>
  );
}
