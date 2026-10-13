import { primitive } from './tokens/primitive.css';
import { semantic } from './tokens/semantic.css';
import { shadow } from './tokens/shadow.css';

export { text } from './tokens/text.css';

/** 화면과 컴포넌트에서 쓰는 토큰 (Semantic) */
export const vars = {
  color: semantic.color,
  typography: semantic.typography,
  spacing: semantic.spacing,
  radius: semantic.radius,
  shadowColor: semantic.shadowColor,
  shadow,
};

/** 원본 값 (Primitive). 화면에서는 직접 쓰지 말고 vars를 쓰세요. */
export { primitive };
