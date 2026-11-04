import type { Preview } from '@storybook/nextjs-vite';
import { createElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { prepareStoryState, type QaParameters } from '../src/stories/support/state';
import {
  setupStoryWorker,
  resetUnexpectedRequests,
  assertNoUnexpectedRequests,
} from '../src/stories/support/network';
import '../src/styles/globals.css';

const states = new Map<string, Awaited<ReturnType<typeof prepareStoryState>>>();

const preview: Preview = {
  loaders: [mswLoader(setupStoryWorker)],
  decorators: [
    (Story, context) => {
      const state = states.get(context.id);
      if (!state) throw new Error(`Storybook 상태 초기화 누락: ${context.id}`);
      return createElement(QueryClientProvider, { client: state.client }, createElement(Story));
    },
  ],
  beforeEach: async (context) => {
    document.documentElement.lang = 'ko';
    resetUnexpectedRequests();
    const state = await prepareStoryState(context.parameters.qa as QaParameters | undefined);
    states.set(context.id, state);
    return async () => {
      try {
        await state.dispose();
      } finally {
        states.delete(context.id);
      }
    };
  },
  afterEach: () => assertNoUnexpectedRequests(),
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true },
    // UI 경고용. CI 경고 보고서 수집은 후속 작업이다.
    a11y: { test: 'todo' },
  },
};
export default preview;
