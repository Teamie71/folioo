import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));

export function resolveContract(args, env = process.env) {
  if (args.some((arg) => !['--check', 'smoke', 'full'].includes(arg))) {
    throw new Error('지원 옵션: --check [smoke|full]');
  }
  if (args.filter((arg) => arg === '--check').length !== 1) {
    throw new Error(
      '현재는 실행 계약 확인(--check)만 지원합니다. E2E runner는 후속 단계에서 연결합니다.',
    );
  }
  const suites = args.filter((arg) => arg !== '--check');
  if (suites.length > 1) throw new Error('smoke 또는 full 중 하나만 지정하세요.');
  const suite = suites[0] ?? 'smoke';
  const rawPort = env.E2E_PORT ?? '3100';
  if (!/^\d+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535) {
    throw new Error('E2E_PORT는 1~65535 정수여야 합니다.');
  }
  const external = env.PLAYWRIGHT_BASE_URL !== undefined;
  const target = external ? env.PLAYWRIGHT_BASE_URL : `http://127.0.0.1:${Number(rawPort)}`;
  let url;
  try {
    url = new URL(target);
  } catch {
    throw new Error('PLAYWRIGHT_BASE_URL은 완전한 HTTP(S) URL이어야 합니다.');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('대상 URL은 HTTP(S)이며 인증 정보·query·hash를 포함할 수 없습니다.');
  }
  if (url.pathname !== '/') throw new Error('현재 계약은 origin URL만 지원합니다.');
  return {
    mode: external ? 'external' : 'local',
    suite,
    baseURL: url.origin,
    build: !external,
    startServer: !external,
    projects: ['desktop-chromium', 'mobile-chromium'],
    includesSmoke: true,
    paths: {
      stories: path.join(root, 'src/stories'),
      fixtures: path.join(root, 'test/fixtures'),
      specs: path.join(root, 'test/e2e/specs'),
      storybookBuild: path.join(root, 'storybook-static'),
      report: path.join(root, 'playwright-report'),
      results: path.join(root, 'test-results'),
    },
    status: 'contract-only',
  };
}
