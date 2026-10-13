// 이 파일은 scripts/generate-tokens.mjs가 figma/variables.json에서 생성했어요. 직접 수정하지 마세요.
import { createGlobalTheme, createGlobalThemeContract } from '@vanilla-extract/css';
import { primitive } from './primitive.css';

const values = {
  color: {
    bg: {
      default: primitive.color.base.white, // Semantic: Colors / bg/default
      hover: primitive.color.gray["200"], // Semantic: Colors / bg/hover
      inverse: primitive.color.gray["700"], // Semantic: Colors / bg/inverse
      primary: primitive.color.main.primary["1"], // Semantic: Colors / bg/primary
      primaryHover: primitive.color.main.primary["2"], // Semantic: Colors / bg/primary-hover
      secondary: primitive.color.main.secondary["1"], // Semantic: Colors / bg/secondary
      secondaryHover: primitive.color.main.secondary["2"], // Semantic: Colors / bg/secondary-hover
      subtle: primitive.color.base.stone, // Semantic: Colors / bg/subtle
      unactive: primitive.color.gray["400"], // Semantic: Colors / bg/unactive
      unselected: primitive.color.gray["300"], // Semantic: Colors / bg/unselected
      skeleton: primitive.color.gray["300"], // Semantic: Colors / bg/skeleton
      success: primitive.color.state.success.secondary, // Semantic: Colors / bg/success
      error: primitive.color.state.error.secondary, // Semantic: Colors / bg/error
    },
    border: {
      primary: primitive.color.main.primary["1"], // Semantic: Colors / border/primary
      placeholder: primitive.color.gray["500"], // Semantic: Colors / border/placeholder
      button: primitive.color.gray["400"], // Semantic: Colors / border/button
      divider: primitive.color.gray["300"], // Semantic: Colors / border/border-divider
      mapline: primitive.color.gray["500"], // Semantic: Colors / border/border-mapline
      focus: primitive.color.base.black, // Semantic: Colors / border/border-focus
    },
    text: {
      default: primitive.color.gray["900"], // Semantic: Colors / text/default
      secondary: primitive.color.gray["600"], // Semantic: Colors / text/secondary
      inverse: primitive.color.base.white, // Semantic: Colors / text/inverse
      unactive: primitive.color.gray["500"], // Semantic: Colors / text/unactive
      placeholder: primitive.color.gray["500"], // Semantic: Colors / text/placeholder
      link: primitive.color.main.primary["1"], // Semantic: Colors / text/link
      selected: primitive.color.main.primary["1"], // Semantic: Colors / text/selected
    },
    icon: {
      default: primitive.color.gray["500"], // Semantic: Colors / icon/default
      strong: primitive.color.base.black, // Semantic: Colors / icon/strong
      inverse: primitive.color.base.white, // Semantic: Colors / icon/inverse
      selected: primitive.color.main.primary["1"], // Semantic: Colors / icon/selected
      primary: primitive.color.main.primary["1"], // Semantic: Colors / icon/primary
    },
    gradient: {
      top: primitive.color.main.secondary["3"], // Semantic: Colors / gradient/top
      bottom: primitive.color.main.primary["1"], // Semantic: Colors / gradient/bottom
    },
  },
  typography: {
    font: {
      default: primitive.typo.font.pretendard, // Semantic:Typography / font/default
    },
    display: {
      size: primitive.typo.size["48"], // Semantic:Typography / display/size
      weight: primitive.typo.weight.bold, // Semantic:Typography / display/weight
      lineHeight: primitive.typo.lineHeight["48"]["130"], // Semantic:Typography / display/line-height
      letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / display/letter-spacing
    },
    header: {
      h1: {
        size: primitive.typo.size["32"], // Semantic:Typography / header/h1/size
        weight: primitive.typo.weight.bold, // Semantic:Typography / header/h1/weight
        lineHeight: primitive.typo.lineHeight["32"]["130"], // Semantic:Typography / header/h1/line-height
        letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / header/h1/letter-spacing
      },
      h2: {
        size: primitive.typo.size["28"], // Semantic:Typography / header/h2/size
        weight: primitive.typo.weight.bold, // Semantic:Typography / header/h2/weight
        lineHeight: primitive.typo.lineHeight["28"]["130"], // Semantic:Typography / header/h2/line-height
        letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / header/h2/letter-spacing
      },
      h3: {
        size: primitive.typo.size["24"], // Semantic:Typography / header/h3/size
        weight: primitive.typo.weight.bold, // Semantic:Typography / header/h3/weight
        lineHeight: primitive.typo.lineHeight["24"]["130"], // Semantic:Typography / header/h3/line-height
        letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / header/h3/letter-spacing
      },
      h4: {
        size: primitive.typo.size["20"], // Semantic:Typography / header/h4/size
        weight: primitive.typo.weight.bold, // Semantic:Typography / header/h4/weight
        lineHeight: primitive.typo.lineHeight["20"]["130"], // Semantic:Typography / header/h4/line-height
        letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / header/h4/letter-spacing
      },
      h5: {
        size: primitive.typo.size["18"], // Semantic:Typography / header/h5/size
        weight: primitive.typo.weight.bold, // Semantic:Typography / header/h5/weight
        lineHeight: primitive.typo.lineHeight["18"]["130"], // Semantic:Typography / header/h5/line-height
        letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / header/h5/letter-spacing
      },
    },
    body: {
      body1: {
        semibold: {
          size: primitive.typo.size["18"], // Semantic:Typography / body/body1/semibold/size
          weight: primitive.typo.weight.semibold, // Semantic:Typography / body/body1/semibold/weight
          lineHeight: primitive.typo.lineHeight["18"]["130"], // Semantic:Typography / body/body1/semibold/line-height
          letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / body/body1/semibold/letter-spacing
        },
        medium: {
          size: primitive.typo.size["18"], // Semantic:Typography / body/body1/medium/size
          weight: primitive.typo.weight.medium, // Semantic:Typography / body/body1/medium/weight
          lineHeight: primitive.typo.lineHeight["18"]["130"], // Semantic:Typography / body/body1/medium/line-height
          letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / body/body1/medium/letter-spacing
        },
        regular: {
          size: primitive.typo.size["18"], // Semantic:Typography / body/body1/regular/size
          weight: primitive.typo.weight.regular, // Semantic:Typography / body/body1/regular/weight
          lineHeight: primitive.typo.lineHeight["18"]["150"], // Semantic:Typography / body/body1/regular/line-height
          letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / body/body1/regular/letter-spacing
        },
      },
      body2: {
        bold: {
          size: primitive.typo.size["16"], // Semantic:Typography / body/body2/bold/size
          weight: primitive.typo.weight.bold, // Semantic:Typography / body/body2/bold/weight
          lineHeight: primitive.typo.lineHeight["16"]["150"], // Semantic:Typography / body/body2/bold/line-height
          letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / body/body2/bold/letter-spacing
        },
        semibold: {
          size: primitive.typo.size["16"], // Semantic:Typography / body/body2/semibold/size
          weight: primitive.typo.weight.semibold, // Semantic:Typography / body/body2/semibold/weight
          lineHeight: primitive.typo.lineHeight["16"]["150"], // Semantic:Typography / body/body2/semibold/line-height
          letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / body/body2/semibold/letter-spacing
        },
        regular: {
          size: primitive.typo.size["16"], // Semantic:Typography / body/body2/regular/size
          weight: primitive.typo.weight.regular, // Semantic:Typography / body/body2/regular/weight
          lineHeight: primitive.typo.lineHeight["16"]["150"], // Semantic:Typography / body/body2/regular/line-height
          letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / body/body2/regular/letter-spacing
        },
      },
    },
    caption: {
      caption1: {
        bold: {
          size: primitive.typo.size["14"], // Semantic:Typography / caption/caption1/bold/size
          weight: primitive.typo.weight.bold, // Semantic:Typography / caption/caption1/bold/weight
          lineHeight: primitive.typo.lineHeight["14"]["150"], // Semantic:Typography / caption/caption1/bold/line-height
          letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / caption/caption1/bold/letter-spacing
        },
        semibold: {
          size: primitive.typo.size["14"], // Semantic:Typography / caption/caption1/semibold/size
          weight: primitive.typo.weight.semibold, // Semantic:Typography / caption/caption1/semibold/weight
          lineHeight: primitive.typo.lineHeight["14"]["150"], // Semantic:Typography / caption/caption1/semibold/line-height
          letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / caption/caption1/semibold/letter-spacing
        },
        regular: {
          size: primitive.typo.size["14"], // Semantic:Typography / caption/caption1/regular/size
          weight: primitive.typo.weight.regular, // Semantic:Typography / caption/caption1/regular/weight
          lineHeight: primitive.typo.lineHeight["14"]["150"], // Semantic:Typography / caption/caption1/regular/line-height
          letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / caption/caption1/regular/letter-spacing
        },
      },
      caption2: {
        size: primitive.typo.size["12"], // Semantic:Typography / caption/caption2/size
        weight: primitive.typo.weight.regular, // Semantic:Typography / caption/caption2/weight
        lineHeight: primitive.typo.lineHeight["12"]["150"], // Semantic:Typography / caption/caption2/line-height
        letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / caption/caption2/letter-spacing
      },
      caption3: {
        size: primitive.typo.size["10"], // Semantic:Typography / caption/caption3/size
        weight: primitive.typo.weight.regular, // Semantic:Typography / caption/caption3/weight
        lineHeight: primitive.typo.lineHeight["10"]["150"], // Semantic:Typography / caption/caption3/line-height
        letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / caption/caption3/letter-spacing
      },
    },
    navigation: {
      default: {
        size: primitive.typo.size["16"], // Semantic:Typography / navigation/default/size
        weight: primitive.typo.weight.regular, // Semantic:Typography / navigation/default/weight
        lineHeight: primitive.typo.lineHeight["16"]["150"], // Semantic:Typography / navigation/default/line-height
        letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / navigation/default/letter-spacing
      },
      selected: {
        size: primitive.typo.size["16"], // Semantic:Typography / navigation/selected/size
        weight: primitive.typo.weight.bold, // Semantic:Typography / navigation/selected/weight
        lineHeight: primitive.typo.lineHeight["16"]["150"], // Semantic:Typography / navigation/selected/line-height
        letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / navigation/selected/letter-spacing
      },
    },
    textfield: {
      size: primitive.typo.size["16"], // Semantic:Typography / textfield/size
      weight: primitive.typo.weight.regular, // Semantic:Typography / textfield/weight
      lineHeight: primitive.typo.lineHeight["16"]["160"], // Semantic:Typography / textfield/line-height
      letterSpacing: primitive.typo.letterSpacing["0"], // Semantic:Typography / textfield/letter-spacing
    },
  },
  radius: {
    none: primitive.number["0"], // Semantic: Radius / radius/radius-none
    xs: primitive.number["4"], // Semantic: Radius / radius/radius-xs
    sm: primitive.number["6"], // Semantic: Radius / radius/radius-sm
    md: primitive.number["8"], // Semantic: Radius / radius/radius-md
    lg: primitive.number["12"], // Semantic: Radius / radius/radius-lg
    xl: primitive.number["16"], // Semantic: Radius / radius/radius-xl
    "2xl": primitive.number["20"], // Semantic: Radius / radius/radius-2xl
    "3xl": primitive.number["60"], // Semantic: Radius / radius/radius-3xl
    full: primitive.number["100"], // Semantic: Radius / radius/radius-full
  },
  spacing: {
    none: primitive.number["0"], // Semantic: Spacing / spacing/spacing-none
    "2xs": primitive.number["4"], // Semantic: Spacing / spacing/spacing-2xs
    xs: primitive.number["8"], // Semantic: Spacing / spacing/spacing-xs
    sm: primitive.number["12"], // Semantic: Spacing / spacing/spacing-sm
    md: primitive.number["16"], // Semantic: Spacing / spacing/spacing-md
    lg: primitive.number["20"], // Semantic: Spacing / spacing/spacing-lg
    xl: primitive.number["24"], // Semantic: Spacing / spacing/spacing-xl
    "2xl": primitive.number["32"], // Semantic: Spacing / spacing/spacing-2xl
    "3xl": primitive.number["40"], // Semantic: Spacing / spacing/spacing-3xl
    "4xl": primitive.number["60"], // Semantic: Spacing / spacing/spacing-4xl
  },
  shadowColor: {
    default: primitive.color.opacity["15"], // Semantic: Shadow / default
    overlay: primitive.color.opacity["20"], // Semantic: Shadow / overlay
    mapblock: primitive.color.opacity["10"], // Semantic: Shadow / mapblock
    chatOut: primitive.color.opacity["10"], // Semantic: Shadow / chat-out
    chatInner: primitive.color.opacity["25"], // Semantic: Shadow / chat-inner
  },
};

export const semantic = createGlobalThemeContract(values, (value: string | null, path: string[]) => `bud-${path.map((p) => p.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()).join('-')}`);

createGlobalTheme(':root', semantic, values);
