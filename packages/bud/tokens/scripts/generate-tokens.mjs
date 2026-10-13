// Figma(variables2json) export → vanilla-extract 테마 소스 생성
// 사용법: node scripts/generate-tokens.mjs
// 입력: figma/variables.json   출력: src/tokens/*.css.ts (직접 수정하지 마세요)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = JSON.parse(readFileSync(resolve(root, 'figma/variables.json'), 'utf8'));
const OUT = resolve(root, 'src/tokens');
mkdirSync(OUT, { recursive: true });

const PREFIX = 'bud';

/* ── 컬렉션 → 토큰 그룹 매핑 ───────────────────────────────────────────── */
const COLLECTIONS = {
  'Primitive: Colors': { layer: 'primitive', group: 'color' },
  'Primitive: Numbers': { layer: 'primitive', group: 'number' },
  'Primitive: Typography': { layer: 'primitive', group: 'typo', keepNames: true },
  'Semantic: Colors': { layer: 'semantic', group: 'color' },
  'Semantic:Typography': { layer: 'semantic', group: 'typography', keepNames: true },
  'Semantic: Spacing': { layer: 'semantic', group: 'spacing', strip: 'spacing' },
  'Semantic: Radius': { layer: 'semantic', group: 'radius', strip: 'radius' },
  'Semantic: Shadow': { layer: 'semantic', group: 'shadowColor' },
};

/* ── 이름 규칙 ─────────────────────────────────────────────────────────────
 * 1) 피그마 경로를 '/'로 나눈다.
 * 2) 앞 세그먼트 이름이 반복되면 뺀다: gray/gray900 → gray/900, radius/radius-md → md
 *    (타이포그래피는 body/body1처럼 반복이 의미를 가지므로 그대로 둔다)
 * 3) TS 키는 camelCase(line-height → lineHeight), CSS 변수는 kebab-case
 */
const camel = (s) => s.replace(/[-&](\w)/g, (_, c) => c.toUpperCase());
const kebab = (s) => s.replace(/&/g, '-').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

function segments(name, strip, keepNames) {
  let segs = name.split('/').map((s) => s.trim());
  if (strip && segs[0] === strip) segs = segs.slice(1);
  if (keepNames) return segs;
  return segs.map((seg, i) => {
    const prev = i === 0 ? strip : segs[i - 1];
    if (prev && seg.toLowerCase().startsWith(prev.toLowerCase()) && seg.length > prev.length) {
      return seg.slice(prev.length).replace(/^[-_]/, '');
    }
    return seg;
  });
}

/* ── 값 포맷 ───────────────────────────────────────────────────────────── */
const round = (n) => Math.round(n * 100) / 100;
function formatNumber(path) {
  return (v) => {
    const last = path[path.length - 1];
    if (path.includes('weight') || last === 'weight') return String(round(v)); // 굵기: 단위 없음
    return `${round(v)}px`; // 크기·행간·자간·간격·모서리: px
  };
}
const formatColor = (v) => v.toLowerCase();

/* ── 수집 ─────────────────────────────────────────────────────────────── */
const tokens = { primitive: {}, semantic: {} };
const byFigma = new Map(); // "Collection::name" → { layer, keyPath }
const warnings = [];

function setDeep(obj, keys, value) {
  let o = obj;
  keys.slice(0, -1).forEach((k) => (o = o[k] ??= {}));
  const last = keys[keys.length - 1];
  if (last in o) warnings.push(`중복된 토큰 키: ${keys.join('.')}`);
  o[last] = value;
}

for (const col of src.collections) {
  const conf = COLLECTIONS[col.name];
  if (!conf) continue; // Typography / Effects / Grids 스타일은 아래에서 따로 처리
  if (col.modes.length > 1) warnings.push(`${col.name}: 모드가 ${col.modes.length}개예요. 첫 번째 모드만 사용했어요.`);
  for (const v of col.modes[0].variables) {
    const segs = segments(v.name, conf.strip, conf.keepNames);
    const keyPath = [conf.group, ...segs.map(camel)];
    byFigma.set(`${col.name}::${v.name}`, { layer: conf.layer, keyPath, type: v.type });
    setDeep(tokens[conf.layer], keyPath, { figma: `${col.name} / ${v.name}`, ...v, segs });
  }
}

/* ── 값 해석 (alias는 다른 변수 참조로 유지) ────────────────────────────── */
function resolveValue(t) {
  if (t.isAlias) {
    const ref = byFigma.get(`${t.value.collection}::${t.value.name}`);
    if (!ref) {
      warnings.push(`참조 대상을 찾을 수 없어요: ${t.figma} → ${t.value.collection} / ${t.value.name}`);
      return { literal: 'unset' };
    }
    return { ref };
  }
  if (t.type === 'color') return { literal: formatColor(t.value) };
  if (t.type === 'number') return { literal: formatNumber(t.segs)(t.value) };
  return { literal: String(t.value) };
}

/* ── TS 코드 생성 ─────────────────────────────────────────────────────── */
const q = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));

const access = (base, path) =>
  base + path.map((p) => (/^[A-Za-z_$][\w$]*$/.test(p) ? `.${p}` : `[${JSON.stringify(p)}]`)).join('');

function emitValues(node, indent) {
  const pad = '  '.repeat(indent);
  return Object.entries(node)
    .map(([k, v]) => {
      if (v && typeof v === 'object' && 'figma' in v) {
        const r = resolveValue(v);
        const expr = r.ref ? access(r.ref.layer, r.ref.keyPath) : JSON.stringify(r.literal);
        return `${pad}${q(k)}: ${expr}, // ${v.figma}`;
      }
      return `${pad}${q(k)}: {\n${emitValues(v, indent + 1)}\n${pad}},`;
    })
    .join('\n');
}

const header = `// 이 파일은 scripts/generate-tokens.mjs가 figma/variables.json에서 생성했어요. 직접 수정하지 마세요.\n`;
const contractFn = `(value: string | null, path: string[]) => \`${PREFIX}-\${path.map((p) => p.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()).join('-')}\``;

writeFileSync(
  resolve(OUT, 'primitive.css.ts'),
  `${header}import { createGlobalTheme, createGlobalThemeContract } from '@vanilla-extract/css';

const values = {
${emitValues(tokens.primitive, 1)}
};

export const primitive = createGlobalThemeContract(values, ${contractFn});

createGlobalTheme(':root', primitive, values);
`,
);

writeFileSync(
  resolve(OUT, 'semantic.css.ts'),
  `${header}import { createGlobalTheme, createGlobalThemeContract } from '@vanilla-extract/css';
import { primitive } from './primitive.css';

const values = {
${emitValues(tokens.semantic, 1)}
};

export const semantic = createGlobalThemeContract(values, ${contractFn});

createGlobalTheme(':root', semantic, values);
`,
);

/* ── 그림자(Effect 스타일) ───────────────────────────────────────────── */
const effects = src.collections.find((c) => c.name === 'Effects')?.modes[0].variables ?? [];
const hex2 = (a) => Math.round(a * 255).toString(16).padStart(2, '0');
const shadowLines = effects.map((e) => {
  const css = e.value.effects
    .filter((f) => f.type === 'DROP_SHADOW' || f.type === 'INNER_SHADOW')
    .map((f) => {
      const c = f.color;
      const col = `#${[c.r, c.g, c.b].map((x) => hex2(x <= 1 ? x : x / 255)).join('')}${hex2(c.a)}`;
      return `${f.type === 'INNER_SHADOW' ? 'inset ' : ''}${f.offset.x}px ${f.offset.y}px ${f.radius}px ${f.spread ?? 0}px ${col}`;
    })
    .join(', ');
  return `  ${q(camel(e.name))}: ${JSON.stringify(css)}, // Effects / ${e.name}`;
});

writeFileSync(
  resolve(OUT, 'shadow.css.ts'),
  `${header}import { createGlobalTheme, createGlobalThemeContract } from '@vanilla-extract/css';

const values = {
${shadowLines.join('\n')}
};

export const shadow = createGlobalThemeContract(values, (_v, path) => \`${PREFIX}-shadow-\${path.join('-').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}\`);

createGlobalTheme(':root', shadow, values);
`,
);

/* ── 텍스트 스타일: Semantic Typography 그룹마다 클래스 하나 ────────────── */
const typo = tokens.semantic.typography ?? {};
const textEntries = [];
(function walk(node, path) {
  const keys = Object.keys(node);
  if (['size', 'weight', 'lineHeight'].every((k) => keys.includes(k))) {
    textEntries.push(path);
    return;
  }
  for (const k of keys) if (node[k] && !('figma' in node[k])) walk(node[k], [...path, k]);
})(typo, []);

const fontFamily = typo.font?.default
  ? `\`\${semantic.typography.font.default}, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif\``
  : `'Pretendard, sans-serif'`;
const textTree = {};
for (const p of textEntries) {
  const a = access('semantic.typography', p);
  const node = p.reduce((o, k) => o[k], typo);
  const body = [
    'fontFamily',
    `fontSize: ${a}.size`,
    `fontWeight: ${a}.weight`,
    `lineHeight: ${a}.lineHeight`,
    ...(node.letterSpacing ? [`letterSpacing: ${a}.letterSpacing`] : []),
  ].join(', ');
  setDeep(textTree, p, `style({ ${body} })`);
}
const emitTree = (node, indent) =>
  Object.entries(node)
    .map(([k, v]) => {
      const pad = '  '.repeat(indent);
      return typeof v === 'string' ? `${pad}${q(k)}: ${v},` : `${pad}${q(k)}: {\n${emitTree(v, indent + 1)}\n${pad}},`;
    })
    .join('\n');
const textLines = [emitTree(textTree, 1)];

writeFileSync(
  resolve(OUT, 'text.css.ts'),
  `${header}import { style } from '@vanilla-extract/css';
import { semantic } from './semantic.css';

const fontFamily = ${fontFamily};

export const text = {
${textLines.join('\n')}
};
`,
);

/* ── 보고 ─────────────────────────────────────────────────────────────── */
const count = (o) => Object.values(o).reduce((n, v) => n + (v && 'figma' in v ? 1 : count(v)), 0);
console.log(`primitive ${count(tokens.primitive)} · semantic ${count(tokens.semantic)} · shadow ${effects.length} · text ${textEntries.length}`);
if (warnings.length) console.warn('\n확인 필요:\n- ' + warnings.join('\n- '));
