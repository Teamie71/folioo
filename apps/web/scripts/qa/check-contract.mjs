import { resolveContract } from './contract.mjs';

try {
  console.log(JSON.stringify(resolveContract(process.argv.slice(2)), null, 2));
  console.log('실행 계약만 확인했습니다. 테스트는 실행하지 않았습니다.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
