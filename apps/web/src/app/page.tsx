import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Icon, PrefixIcon, SuffixIcon } from '@/components/ui/icon';
import { vars } from '@/styles/theme';
import PlusIcon from '@/assets/icons/plus.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import UploadIcon from '@/assets/icons/upload.svg';
import PaperclipIcon from '@/assets/icons/paperclip.svg';
import ArrowUpIcon from '@/assets/icons/arrow-up.svg';
import ListCheckIcon from '@/assets/icons/list-check.svg';
import { SocialLoginButton } from '@/components/ui/social-login-button';

function ExampleRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="space-y-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-[var(--bud-color-text-secondary)]">{description}</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-4 sm:col-span-3">{children}</div>
    </div>
  );
}

// Temporary integration fixture, not a product screen or finalized Button API.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-6 py-12 sm:px-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">공용 컴포넌트 개발 환경</h1>
        <p className="text-[var(--bud-color-text-secondary)]">
          버튼 종류와 사용 방식을 분류한 예시입니다. 각 버튼의 hover와 focus 상태도 확인할 수
          있습니다.
        </p>
      </header>

      <section aria-labelledby="standard-buttons" className="space-y-6">
        <h2 id="standard-buttons" className="text-xl font-bold">
          일반 버튼
        </h2>
        <ExampleRow title="primary" description="주요 행동을 강조하는 버튼">
          <Button fontWeight="bold" radius="full">
            로그 등록하기
          </Button>
          <Button fontWeight="bold" radius="full">
            <PrefixIcon size={24} svg={<ListCheckIcon />} />
            포트폴리오 첨삭 받기 →
          </Button>
          <Button fontWeight="bold" size="medium">
            구매하기
          </Button>
        </ExampleRow>
        <ExampleRow title="secondary" description="주요 행동을 보조하는 버튼">
          <Button variant="secondary" borderWidth="normal" fontWeight="bold" radius="full">
            나가기
          </Button>
          <Button variant="secondary" fontWeight="semibold" size="small">
            피드백 남기기
          </Button>
        </ExampleRow>
        <ExampleRow title="gradient" description="그라데이션으로 강조하는 버튼">
          <Button variant="gradient" radius="full" fontWeight="bold">
            무료로 시작하기 →
          </Button>
        </ExampleRow>
        <ExampleRow title="neutral" description="중립적인 테두리 버튼">
          <Button variant="neutral" size="xsmall" fontWeight="regular">
            <PrefixIcon size={20} color={vars.color.icon.default} svg={<TrashIcon />} />
            활동 삭제
          </Button>
        </ExampleRow>
        <ExampleRow title="elevate" description="그림자로 구분하는 흰색 버튼">
          <Button variant="elevate" radius="full" size="large" fontWeight="bold">
            <PrefixIcon size={16} color={vars.color.icon.primary} svg={<PlusIcon />} />
            새로운 경험 정리 시작하기
          </Button>
        </ExampleRow>
        <ExampleRow title="ghost" description="배경·테두리 없는 일반 버튼">
          <Button variant="ghost" size="small">
            취소
          </Button>
          <Button variant="ghost" size="small">
            <PrefixIcon size={20} svg={<TrashIcon />} />
            삭제
          </Button>
        </ExampleRow>
      </section>

      <section
        aria-labelledby="text-buttons"
        className="space-y-6 border-t border-[var(--bud-color-border-divider)] pt-8"
      >
        <h2 id="text-buttons" className="text-xl font-bold">
          텍스트 버튼
        </h2>
        <ExampleRow title="text · underline" description="밑줄이 있는 텍스트 버튼">
          <Button variant="text" fontWeight="regular" textDecoration="underline">
            피드백 남기러 가기 →
          </Button>
        </ExampleRow>
        <ExampleRow title="text · PrefixIcon" description="아이콘과 텍스트를 함께 표시">
          <Button variant="text" fontWeight="regular" textSize="small">
            <PrefixIcon size={20} color={vars.color.icon.default} svg={<TrashIcon />} />
            삭제
          </Button>
          <Button variant="text" fontWeight="regular">
            <PrefixIcon size={20} color={vars.color.icon.default} svg={<UploadIcon />} />
            내보내기
          </Button>
        </ExampleRow>
      </section>

      <section
        aria-labelledby="icon-buttons"
        className="space-y-6 border-t border-[var(--bud-color-border-divider)] pt-8"
      >
        <h2 id="icon-buttons" className="text-xl font-bold">
          아이콘 전용 버튼
        </h2>
        <ExampleRow title="ghost · iconOnly" description="배경 없이 아이콘만 표시">
          <Button variant="ghost" layout="iconOnly" size="fit" aria-label="파일 첨부">
            <Icon size={24} svg={<PaperclipIcon />} />
          </Button>
        </ExampleRow>
        <ExampleRow title="primary · iconOnly" description="배경이 있는 아이콘 버튼">
          <Button layout="iconOnly" size="small" radius="full" aria-label="전송">
            <Icon size={20} svg={<ArrowUpIcon />} />
          </Button>
        </ExampleRow>
      </section>

      <section
        aria-labelledby="social-buttons"
        className="space-y-6 border-t border-[var(--bud-color-border-divider)] pt-8"
      >
        <div className="space-y-2">
          <h2 id="social-buttons" className="text-xl font-bold">
            소셜 로그인 버튼
          </h2>
        </div>
        <ExampleRow title="kakao" description="socialType으로 카카오 로고·문구 선택">
          <SocialLoginButton socialType="kakao" />
        </ExampleRow>
        <ExampleRow title="naver" description="socialType으로 네이버 로고·문구 선택">
          <SocialLoginButton socialType="naver" />
        </ExampleRow>
      </section>

      <section
        aria-labelledby="button-states"
        className="space-y-6 border-t border-[var(--bud-color-border-divider)] pt-8"
      >
        <h2 id="button-states" className="text-xl font-bold">
          버튼 상태
        </h2>
        <ExampleRow title="기본 / disabled" description="같은 버튼의 활성·비활성 상태 비교">
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
          <Button
            disabled
            variant="secondary"
            fontWeight="medium"
            size="xsmall"
            radius="full"
            textSize="small"
          >
            환불 신청
            <SuffixIcon size={12} svg={<ChevronRightIcon />} />
          </Button>
        </ExampleRow>
      </section>

      <section
        aria-labelledby="button-layouts"
        className="space-y-6 border-t border-[var(--bud-color-border-divider)] pt-8"
      >
        <h2 id="button-layouts" className="text-xl font-bold">
          크기·레이아웃
        </h2>
        <ExampleRow title="size = modal" description="모달에서 사용하는 패딩 규격">
          <Button size="modal" fontWeight="semibold">
            진행
          </Button>
        </ExampleRow>
        <ExampleRow title="전체 너비" description="외부 className으로 너비와 배치 조정">
          <Button className="w-full">전체 너비 버튼</Button>
        </ExampleRow>
      </section>
    </main>
  );
}
