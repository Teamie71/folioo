import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';

const PART_PATHS = Object.freeze({
  bud: ['packages/bud/'],
  web: ['apps/web/', 'packages/bud/'],
});

const PART_FREE_PATTERNS = [
  /\.md$/,
  /^\.github\/ISSUE_TEMPLATE\//,
  /^\.prettierrc\.json$/,
  /^\.prettierignore$/,
  /^eslint\.config\.mjs$/,
  /^\.gitignore$/,
];

const PARTS = Object.keys(PART_PATHS);

function listGitPaths(...args) {
  const output = execFileSync('git', args, { encoding: 'utf8' });
  return output.split('\0').filter(Boolean);
}

function findOwnerParts(file) {
  return PARTS.filter((part) => PART_PATHS[part].some((prefix) => file.startsWith(prefix)));
}

function findUnownedPackages() {
  return listGitPaths('ls-files', '-z', '--', '*/package.json')
    .map(dirname)
    .filter((packageDir) => findOwnerParts(`${packageDir}/`).length === 0);
}

function isPartFree(file) {
  return PART_FREE_PATTERNS.some((pattern) => pattern.test(file));
}

function selectAllParts(reason) {
  return Object.fromEntries(PARTS.map((part) => [part, reason]));
}

function planPullRequest(changedFiles) {
  const reasons = {};

  for (const file of changedFiles) {
    const ownerParts = findOwnerParts(file);
    if (ownerParts.length > 0) {
      for (const part of ownerParts) {
        reasons[part] ??= `${file} 변경`;
      }
      continue;
    }
    if (!isPartFree(file)) {
      return selectAllParts(`${file} 변경은 모든 파트에 영향`);
    }
  }

  return reasons;
}

function writeOutputs(reasons) {
  const skippedParts = PARTS.filter((part) => !reasons[part]);
  const lines = [
    ...PARTS.map((part) => `${part}=${Boolean(reasons[part])}`),
    `skipped=${skippedParts.join(',')}`,
  ];
  const summary = [
    '| 파트 | 실행 | 이유 |',
    '| --- | --- | --- |',
    ...PARTS.map(
      (part) =>
        `| ${part} | ${reasons[part] ? '예' : '아니오'} | ${reasons[part] ?? '변경 없음'} |`,
    ),
  ];

  console.log(lines.join('\n'));
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary.join('\n')}\n`);
  }
}

const unownedPackages = findUnownedPackages();
if (unownedPackages.length > 0) {
  console.error(
    `어느 파트에도 속하지 않은 패키지가 있어 검사 대상을 정할 수 없습니다: ${unownedPackages.join(', ')}\n` +
      '.github/scripts/plan-ci.mjs의 PART_PATHS와 .github/workflows/ci.yml에 해당 파트 job을 추가하세요.',
  );
  process.exit(1);
}

const [baseRef = 'HEAD^1', headRef = 'HEAD'] = process.argv.slice(2);
const isPullRequest = process.env.GITHUB_EVENT_NAME === 'pull_request';

writeOutputs(
  isPullRequest
    ? planPullRequest(listGitPaths('diff', '-z', '--name-only', '--no-renames', baseRef, headRef))
    : selectAllParts(`${process.env.GITHUB_EVENT_NAME ?? 'local'} 이벤트는 전체 검사`),
);
