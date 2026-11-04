import type { Preview } from '@storybook/nextjs-vite';
import '../src/styles/globals.css';

const preview: Preview = {
  beforeEach: () => {
    document.documentElement.lang = 'ko';
  },
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true },
    // UI 경고용. CI 경고 보고서 수집은 후속 작업이다.
    a11y: { test: 'todo' },
  },
};
export default preview;
