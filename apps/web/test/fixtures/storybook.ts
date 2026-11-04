// 도구와 무관한 실행 환경 검증용 데이터. 실제 제품 API 계약이 아니다.
export type QaMessage = { message: string };

export const qaMessage = (message = '응답 준비 완료'): QaMessage => ({ message });
