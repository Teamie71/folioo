import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor } from 'storybook/test';
import { delay, http, HttpResponse } from 'msw';
import 'msw-storybook-addon/csf3';
import { Button } from '@/components/ui/button';
import { qaMessage, type QaMessage } from '../../../test/fixtures/storybook';
import type { QaParameters } from '../support/state';

const endpoint = '/__qa_api/message';
const queryKey = ['qa-message'];
const moduleState = { dirty: false };

function DataProbe() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }): Promise<QaMessage> => {
      const response = await fetch(endpoint, { signal });
      if (!response.ok) throw new Error(`조회 실패 (${response.status})`);
      return response.json();
    },
  });
  return (
    <section aria-label="데이터 실행 환경" className="flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-bold">데이터 실행 환경</h1>
      <p>
        초기 캐시:{' '}
        {client.getQueryData(['qa-dirty']) === undefined ? '비어 있음' : '이전 데이터 남음'}
      </p>
      {query.isPending && <p role="status">불러오는 중</p>}
      {query.isError && (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button onClick={() => void query.refetch()}>다시 시도</Button>
        </div>
      )}
      {query.isSuccess && <p role="status">{query.data.message || '데이터 없음'}</p>}
      <Button
        onClick={() => {
          localStorage.setItem('qa-dirty', 'previous');
          sessionStorage.setItem('qa-dirty', 'previous');
          client.setQueryData(['qa-dirty'], 'previous');
          moduleState.dirty = true;
        }}
      >
        격리 검증용 상태 변경
      </Button>
    </section>
  );
}

const meta = {
  title: 'QA/DataEnvironment',
  component: DataProbe,
  parameters: {
    qa: {
      resetState: () => {
        moduleState.dirty = false;
      },
    } satisfies QaParameters,
  },
  beforeEach: () => {
    expect(localStorage.getItem('qa-dirty')).toBeNull();
    expect(sessionStorage.getItem('qa-dirty')).toBeNull();
    expect(moduleState.dirty).toBe(false);
  },
} satisfies Meta<typeof DataProbe>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  beforeEach: ({ msw }) => {
    msw.use(http.get(endpoint, () => HttpResponse.json(qaMessage())));
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('초기 캐시: 비어 있음')).toBeVisible();
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('응답 준비 완료'));
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const Empty: Story = {
  beforeEach: ({ msw }) => {
    msw.use(http.get(endpoint, () => HttpResponse.json(qaMessage(''))));
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('초기 캐시: 비어 있음')).toBeVisible();
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('데이터 없음'));
  },
};

export const BadRequest: Story = {
  beforeEach: ({ msw }) => {
    msw.use(http.get(endpoint, () => new HttpResponse(null, { status: 400 })));
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('초기 캐시: 비어 있음')).toBeVisible();
    await expect(await canvas.findByRole('alert')).toHaveTextContent('조회 실패 (400)');
  },
};

export const ServerError: Story = {
  beforeEach: ({ msw }) => {
    msw.use(http.get(endpoint, () => new HttpResponse(null, { status: 500 })));
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('초기 캐시: 비어 있음')).toBeVisible();
    await expect(await canvas.findByRole('alert')).toHaveTextContent('조회 실패 (500)');
    await expect(canvas.getByRole('button', { name: '다시 시도' })).toBeVisible();
  },
};

export const NetworkError: Story = {
  beforeEach: ({ msw }) => {
    msw.use(http.get(endpoint, () => HttpResponse.error()));
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('초기 캐시: 비어 있음')).toBeVisible();
    await expect(await canvas.findByRole('alert')).toBeVisible();
    await expect(canvas.getByRole('button', { name: '다시 시도' })).toBeVisible();
    await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
  },
};

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      http.get(endpoint, async () => {
        await delay('infinite');
        return HttpResponse.json(qaMessage());
      }),
    );
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('초기 캐시: 비어 있음')).toBeVisible();
    await expect(canvas.getByRole('status')).toHaveTextContent('불러오는 중');
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const Retry: Story = {
  beforeEach: ({ msw }) => {
    let calls = 0; // 실행마다 새 closure를 만들어 호출 횟수가 다음 스토리에 남지 않게 한다.
    msw.use(
      http.get(endpoint, () =>
        ++calls === 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(qaMessage('복구 완료')),
      ),
    );
  },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('초기 캐시: 비어 있음')).toBeVisible();
    await expect(await canvas.findByRole('alert')).toHaveTextContent('조회 실패 (500)');
    await userEvent.click(canvas.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('복구 완료'));
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const Isolation: Story = {
  beforeEach: ({ msw }) => {
    msw.use(http.get(endpoint, () => HttpResponse.json(qaMessage('격리 확인'))));
  },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('초기 캐시: 비어 있음')).toBeVisible();
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('격리 확인'));
    await userEvent.click(canvas.getByRole('button', { name: '격리 검증용 상태 변경' }));
    await expect(localStorage.getItem('qa-dirty')).toBe('previous');
    await expect(sessionStorage.getItem('qa-dirty')).toBe('previous');
    await expect(moduleState.dirty).toBe(true);
  },
};
