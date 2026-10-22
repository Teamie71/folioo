import { Button } from '@/components/ui/button';

// Temporary integration fixture, not a product screen or finalized Button API.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 p-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">공용 컴포넌트 개발 환경</h1>
        <p>BUD 토큰 · vanilla-extract recipes · Tailwind 레이아웃</p>
      </header>
      <section aria-label="버튼 상태" className="flex flex-wrap items-center gap-4">
        <Button>기본 버튼</Button>
        <Button variant="secondary">보조 버튼</Button>
        <Button size="sm">작은 버튼</Button>
        <Button disabled>비활성 버튼</Button>
      </section>
      <section aria-label="레이아웃 조합" className="space-y-3">
        <p>외부 className으로 너비와 배치를 조정합니다.</p>
        <Button className="flex w-full">전체 너비 버튼</Button>
      </section>
    </main>
  );
}
