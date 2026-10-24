import { Button } from '@/components/ui/button';
import { Icon, PrefixIcon, SuffixIcon } from '@/components/ui/icon';
import PlusIcon from '@/assets/icons/plus.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import UploadIcon from '@/assets/icons/upload.svg';
import PaperclipIcon from '@/assets/icons/paperclip.svg';
import ArrowUpIcon from '@/assets/icons/arrow-up.svg';
import ListCheckIcon from '@/assets/icons/list-check.svg';

// Temporary integration fixture, not a product screen or finalized Button API.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 p-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">공용 컴포넌트 개발 환경</h1>
        <p>BUD 토큰 · vanilla-extract recipes · Tailwind 레이아웃</p>
      </header>
      <section aria-label="버튼 상태" className="flex flex-wrap items-center gap-4">
        <Button fontWeight="bold" radius="full">
          로그 등록하기
        </Button>
        <Button fontWeight="bold" radius="full">
          <PrefixIcon size={24} svg={<ListCheckIcon />} />
          포트폴리오 첨삭 받기 →
        </Button>
        <Button variant="secondary" borderWidth="normal" fontWeight="bold" radius="full">
          나가기
        </Button>
        <Button fontWeight="bold" size="medium">
          구매하기
        </Button>
        <Button variant="gradient" radius="full" fontWeight="bold">
          무료로 시작하기 →
        </Button>
        <Button variant="elevate" radius="full" size="large" fontWeight="bold">
          <PrefixIcon size={16} svg={<PlusIcon />} />
          새로운 경험 정리 시작하기
        </Button>
        <Button variant="secondary" fontWeight="semibold" size="small">
          피드백 남기기
        </Button>
        <Button variant="text" fontWeight="regular" textDecoration="underline">
          피드백 남기러 가기 →
        </Button>
        <Button variant="neutral" size="xsmall" fontWeight="regular">
          <PrefixIcon size={20} svg={<TrashIcon />} />
          활동 삭제
        </Button>
        <Button
          variant="secondary"
          fontWeight="medium"
          size="xsmall"
          radius="full"
          textSize="small"
        >
          환불 신청
          <SuffixIcon size={12} svg={<ChevronRightIcon />} />
        </Button>
        <Button disabled fontWeight="medium" size="xsmall" radius="full" textSize="small">
          환불 신청
          <SuffixIcon size={12} svg={<ChevronRightIcon />} />
        </Button>
        <Button variant="text" fontWeight="regular" textSize="small">
          <PrefixIcon size={24} svg={<TrashIcon />} />
          삭제
        </Button>
        <Button variant="text" fontWeight="regular">
          <PrefixIcon size={20} svg={<UploadIcon />} />
          내보내기
        </Button>
        <Button size="modal" fontWeight="semibold">
          진행
        </Button>
      </section>
      <section aria-label="아이콘 전용 버튼" className="flex items-center gap-4">
        <Button variant="ghost" layout="iconOnly" size="xsmall" aria-label="파일 첨부">
          <Icon size={28} svg={<PaperclipIcon />} />
        </Button>

        <Button layout="iconOnly" radius="full" aria-label="전송" className="size-8">
          <Icon size={20} svg={<ArrowUpIcon />} />
        </Button>
      </section>
      <section aria-label="레이아웃 조합" className="space-y-3">
        <p>외부 className으로 너비와 배치를 조정합니다.</p>
        <Button className="flex w-full">전체 너비 버튼</Button>
      </section>
    </main>
  );
}
