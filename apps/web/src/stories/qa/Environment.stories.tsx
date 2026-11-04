import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor } from 'storybook/test';
import { Button } from '@/components/ui/button';
import { vars } from '@/styles/theme';

function EnvironmentProbe() {
  const [count, setCount] = useState(0);
  return (
    <section aria-label="Storybook 실행 환경" className="flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-bold">Folioo 검사 환경</h1>
      <p>vanilla-extract · BUD 토큰 · Tailwind · Pretendard</p>
      {/* public 정적 경로를 검사하기 위해 native image를 사용한다. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/plus-icon.svg" alt="더하기 아이콘" width={24} height={24} />
      <Button onClick={() => setCount((value) => value + 1)}>확인 횟수 늘리기</Button>
      <p role="status">확인 횟수: {count}</p>
      <span
        data-testid="primary-token"
        aria-hidden="true"
        style={{ backgroundColor: vars.color.bg.primary }}
      />
    </section>
  );
}
const meta = { title: 'QA/Environment', component: EnvironmentProbe } satisfies Meta<
  typeof EnvironmentProbe
>;
export default meta;
type Story = StoryObj<typeof meta>;

// 제품 smoke가 아닌 Storybook 컴파일·브라우저 기반 검사다.
export const Ready: Story = {
  play: async ({ canvas, userEvent }) => {
    const section = canvas.getByRole('region', { name: 'Storybook 실행 환경' });
    const button = canvas.getByRole('button', { name: '확인 횟수 늘리기' });
    await expect(canvas.getByRole('heading', { name: 'Folioo 검사 환경' })).toBeVisible();
    await expect(getComputedStyle(section).display).toBe('flex');
    await expect(getComputedStyle(section).gap).toBe('16px');
    // 공개 토큰과 VE recipe가 연결됐는지 확인한다. 클래스 해시는 고정하지 않는다.
    const tokenProbe = canvas.getByTestId('primary-token');
    const token = getComputedStyle(tokenProbe).getPropertyValue('--bud-color-bg-primary').trim();
    await expect(token).not.toBe('');
    await expect(getComputedStyle(button).backgroundColor).toBe(
      getComputedStyle(tokenProbe).backgroundColor,
    );
    await expect(getComputedStyle(button).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    await document.fonts.load('16px Pretendard', 'Folioo 검사 환경');
    await document.fonts.ready;
    await expect(getComputedStyle(button).fontFamily).toContain('Pretendard');
    await expect(
      [...document.fonts].some(
        (face) => face.family.replace(/["']/g, '') === 'Pretendard' && face.status === 'loaded',
      ),
    ).toBe(true);
    const image = canvas.getByRole('img', { name: '더하기 아이콘' }) as HTMLImageElement;
    await waitFor(() => expect(image.naturalWidth).toBeGreaterThan(0));
    await expect(document.documentElement.lang).toBe('ko');
    await expect(canvas.getByRole('status')).toHaveTextContent('확인 횟수: 0');
    await userEvent.click(button);
    await expect(canvas.getByRole('status')).toHaveTextContent('확인 횟수: 1');
  },
};
