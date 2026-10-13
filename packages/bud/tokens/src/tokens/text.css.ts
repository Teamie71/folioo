// 이 파일은 scripts/generate-tokens.mjs가 figma/variables.json에서 생성했어요. 직접 수정하지 마세요.
import { style } from '@vanilla-extract/css';
import { semantic } from './semantic.css';

const fontFamily = `${semantic.typography.font.default}, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;

export const text = {
  display: style({ fontFamily, fontSize: semantic.typography.display.size, fontWeight: semantic.typography.display.weight, lineHeight: semantic.typography.display.lineHeight, letterSpacing: semantic.typography.display.letterSpacing }),
  header: {
    h1: style({ fontFamily, fontSize: semantic.typography.header.h1.size, fontWeight: semantic.typography.header.h1.weight, lineHeight: semantic.typography.header.h1.lineHeight, letterSpacing: semantic.typography.header.h1.letterSpacing }),
    h2: style({ fontFamily, fontSize: semantic.typography.header.h2.size, fontWeight: semantic.typography.header.h2.weight, lineHeight: semantic.typography.header.h2.lineHeight, letterSpacing: semantic.typography.header.h2.letterSpacing }),
    h3: style({ fontFamily, fontSize: semantic.typography.header.h3.size, fontWeight: semantic.typography.header.h3.weight, lineHeight: semantic.typography.header.h3.lineHeight, letterSpacing: semantic.typography.header.h3.letterSpacing }),
    h4: style({ fontFamily, fontSize: semantic.typography.header.h4.size, fontWeight: semantic.typography.header.h4.weight, lineHeight: semantic.typography.header.h4.lineHeight, letterSpacing: semantic.typography.header.h4.letterSpacing }),
    h5: style({ fontFamily, fontSize: semantic.typography.header.h5.size, fontWeight: semantic.typography.header.h5.weight, lineHeight: semantic.typography.header.h5.lineHeight, letterSpacing: semantic.typography.header.h5.letterSpacing }),
  },
  body: {
    body1: {
      semibold: style({ fontFamily, fontSize: semantic.typography.body.body1.semibold.size, fontWeight: semantic.typography.body.body1.semibold.weight, lineHeight: semantic.typography.body.body1.semibold.lineHeight, letterSpacing: semantic.typography.body.body1.semibold.letterSpacing }),
      medium: style({ fontFamily, fontSize: semantic.typography.body.body1.medium.size, fontWeight: semantic.typography.body.body1.medium.weight, lineHeight: semantic.typography.body.body1.medium.lineHeight, letterSpacing: semantic.typography.body.body1.medium.letterSpacing }),
      regular: style({ fontFamily, fontSize: semantic.typography.body.body1.regular.size, fontWeight: semantic.typography.body.body1.regular.weight, lineHeight: semantic.typography.body.body1.regular.lineHeight, letterSpacing: semantic.typography.body.body1.regular.letterSpacing }),
    },
    body2: {
      bold: style({ fontFamily, fontSize: semantic.typography.body.body2.bold.size, fontWeight: semantic.typography.body.body2.bold.weight, lineHeight: semantic.typography.body.body2.bold.lineHeight, letterSpacing: semantic.typography.body.body2.bold.letterSpacing }),
      semibold: style({ fontFamily, fontSize: semantic.typography.body.body2.semibold.size, fontWeight: semantic.typography.body.body2.semibold.weight, lineHeight: semantic.typography.body.body2.semibold.lineHeight, letterSpacing: semantic.typography.body.body2.semibold.letterSpacing }),
      regular: style({ fontFamily, fontSize: semantic.typography.body.body2.regular.size, fontWeight: semantic.typography.body.body2.regular.weight, lineHeight: semantic.typography.body.body2.regular.lineHeight, letterSpacing: semantic.typography.body.body2.regular.letterSpacing }),
    },
  },
  caption: {
    caption1: {
      bold: style({ fontFamily, fontSize: semantic.typography.caption.caption1.bold.size, fontWeight: semantic.typography.caption.caption1.bold.weight, lineHeight: semantic.typography.caption.caption1.bold.lineHeight, letterSpacing: semantic.typography.caption.caption1.bold.letterSpacing }),
      semibold: style({ fontFamily, fontSize: semantic.typography.caption.caption1.semibold.size, fontWeight: semantic.typography.caption.caption1.semibold.weight, lineHeight: semantic.typography.caption.caption1.semibold.lineHeight, letterSpacing: semantic.typography.caption.caption1.semibold.letterSpacing }),
      regular: style({ fontFamily, fontSize: semantic.typography.caption.caption1.regular.size, fontWeight: semantic.typography.caption.caption1.regular.weight, lineHeight: semantic.typography.caption.caption1.regular.lineHeight, letterSpacing: semantic.typography.caption.caption1.regular.letterSpacing }),
    },
    caption2: style({ fontFamily, fontSize: semantic.typography.caption.caption2.size, fontWeight: semantic.typography.caption.caption2.weight, lineHeight: semantic.typography.caption.caption2.lineHeight, letterSpacing: semantic.typography.caption.caption2.letterSpacing }),
    caption3: style({ fontFamily, fontSize: semantic.typography.caption.caption3.size, fontWeight: semantic.typography.caption.caption3.weight, lineHeight: semantic.typography.caption.caption3.lineHeight, letterSpacing: semantic.typography.caption.caption3.letterSpacing }),
  },
  navigation: {
    default: style({ fontFamily, fontSize: semantic.typography.navigation.default.size, fontWeight: semantic.typography.navigation.default.weight, lineHeight: semantic.typography.navigation.default.lineHeight, letterSpacing: semantic.typography.navigation.default.letterSpacing }),
    selected: style({ fontFamily, fontSize: semantic.typography.navigation.selected.size, fontWeight: semantic.typography.navigation.selected.weight, lineHeight: semantic.typography.navigation.selected.lineHeight, letterSpacing: semantic.typography.navigation.selected.letterSpacing }),
  },
  textfield: style({ fontFamily, fontSize: semantic.typography.textfield.size, fontWeight: semantic.typography.textfield.weight, lineHeight: semantic.typography.textfield.lineHeight, letterSpacing: semantic.typography.textfield.letterSpacing }),
};
