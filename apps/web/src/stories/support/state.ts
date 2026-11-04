import { QueryClient } from '@tanstack/react-query';

export type QaParameters = {
  // 사용한 모듈·Store 상태는 이 함수에서 초기화한다. 제품 인증 상태는 아직 없다.
  resetState?: () => void | Promise<void>;
};

function captureStorage(storage: Storage) {
  return Object.fromEntries(Object.keys(storage).map((key) => [key, storage.getItem(key)!]));
}

function restoreStorage(storage: Storage, saved: Record<string, string>) {
  storage.clear();
  Object.entries(saved).forEach(([key, value]) => storage.setItem(key, value));
}

export async function prepareStoryState(parameters: QaParameters = {}) {
  const local = captureStorage(localStorage);
  const session = captureStorage(sessionStorage);
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: { retry: false },
    },
  });
  const dispose = async () => {
    try {
      await client.cancelQueries();
    } finally {
      client.clear();
      try {
        await parameters.resetState?.();
      } finally {
        restoreStorage(localStorage, local);
        restoreStorage(sessionStorage, session);
      }
    }
  };
  try {
    localStorage.clear();
    sessionStorage.clear();
    await parameters.resetState?.();
  } catch (error) {
    await dispose();
    throw error;
  }
  return { client, dispose };
}
