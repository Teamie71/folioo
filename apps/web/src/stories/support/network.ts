import { http, HttpResponse, passthrough } from 'msw';
import { setupWorker } from 'msw/browser';

const unexpectedRequests: string[] = [];

function isToolRequest(request: Request) {
  const url = new URL(request.url);
  if (url.origin !== location.origin) return false;
  // 같은 origin의 브라우저 자산과 예약된 도구 경로만 허용한다.
  // 확장자만으로 허용하면 /api/data.json 같은 미등록 API가 빠져나간다.
  return (
    Boolean(request.destination) ||
    /^\/(?:@|src\/|node_modules\/|__vitest|sb-|assets\/|fonts\/|icons\/|virtual:)/.test(
      url.pathname,
    ) ||
    [
      '/index.json',
      '/iframe.html',
      '/mockServiceWorker.js',
      '/vite-inject-mocker-entry.js',
    ].includes(url.pathname)
  );
}

// 초기 handler는 addon의 resetHandlers 이후에도 남고, 스토리별 handler가 우선한다.
const worker = setupWorker(
  http.all('*', ({ request }) => {
    if (isToolRequest(request)) return passthrough();
    const url = new URL(request.url);
    // query/body에 포함될 수 있는 개인정보나 토큰은 오류 로그에 남기지 않는다.
    unexpectedRequests.push(`${request.method} ${url.origin}${url.pathname}`);
    return HttpResponse.error();
  }),
);

export async function setupStoryWorker() {
  await worker.start({ quiet: true });
  return worker;
}

export function resetUnexpectedRequests() {
  unexpectedRequests.length = 0;
}

export function assertNoUnexpectedRequests() {
  if (unexpectedRequests.length > 0) {
    throw new Error(`정의되지 않은 Storybook API 요청:\n${unexpectedRequests.join('\n')}`);
  }
}
