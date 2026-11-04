const suite = process.argv[2];
if (process.argv.length !== 3 || !['smoke', 'full'].includes(suite)) {
  console.error('사용법: run-e2e.mjs smoke|full');
} else {
  console.error(
    `E2E ${suite} 실행기는 아직 구현되지 않았습니다. qa:plan ${suite}로 실행 계획만 확인할 수 있습니다.`,
  );
}
process.exitCode = 1;
