'use client';

import { useState } from 'react';
import CommonErrorLayout from '@/components/error/CommonErrorLayout';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const [isMobile, setIsMobile] = useState(false);

  return (
    <>
      <CommonErrorLayout isMobile={isMobile} />
      {process.env.NODE_ENV === 'development' && (
        <Button
          variant='secondary'
          size='small'
          className='fixed right-[1rem] bottom-[1rem] z-50'
          data-404-preview-toggle='true'
          onClick={() => setIsMobile((previous) => !previous)}
        >
          {isMobile ? 'PC로 보기' : '모바일로 보기'}
        </Button>
      )}
    </>
  );
}
