// 이 파일은 scripts/generate-tokens.mjs가 figma/variables.json에서 생성했어요. 직접 수정하지 마세요.
import { createGlobalTheme, createGlobalThemeContract } from '@vanilla-extract/css';

const values = {
  modal: "0px 8px 20px 0px #00000033", // Effects / modal
  dropdown: "0px 6px 20px -2px #00000026", // Effects / dropdown
  chatCard: "0px 4px 8px 0px #00000033", // Effects / chat&card
};

export const shadow = createGlobalThemeContract(values, (_v, path) => `bud-shadow-${path.join('-').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`);

createGlobalTheme(':root', shadow, values);
