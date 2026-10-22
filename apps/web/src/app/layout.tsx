import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Folioo — 스타일 개발 환경',
  description: 'BUD 토큰과 vanilla-extract 스타일 통합 확인',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
