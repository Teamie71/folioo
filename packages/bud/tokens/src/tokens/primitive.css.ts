// 이 파일은 scripts/generate-tokens.mjs가 figma/variables.json에서 생성했어요. 직접 수정하지 마세요.
import { createGlobalTheme, createGlobalThemeContract } from '@vanilla-extract/css';

const values = {
  color: {
    main: {
      primary: {
        "1": "#5060c5", // Primitive: Colors / main/primary/primary1
        "2": "#404d9e", // Primitive: Colors / main/primary/primary2
      },
      secondary: {
        "1": "#f6f5ff", // Primitive: Colors / main/secondary/secondary1
        "2": "#eeedf7", // Primitive: Colors / main/secondary/secondary2
        "3": "#93b3f4", // Primitive: Colors / main/secondary/secondary3
      },
    },
    state: {
      success: {
        primary: "#00a000", // Primitive: Colors / state/success/primary
        secondary: "#f1fef0", // Primitive: Colors / state/success/secondary
      },
      error: {
        primary: "#dc0000", // Primitive: Colors / state/error/primary
        secondary: "#fff2f2", // Primitive: Colors / state/error/secondary
      },
    },
    gray: {
      "100": "#fdfdfd", // Primitive: Colors / gray/gray100
      "200": "#f6f8fa", // Primitive: Colors / gray/gray200
      "300": "#e9eaec", // Primitive: Colors / gray/gray300
      "400": "#cdd0d5", // Primitive: Colors / gray/gray400
      "500": "#9ea4a9", // Primitive: Colors / gray/gray500
      "600": "#74777d", // Primitive: Colors / gray/gray600
      "700": "#464b53", // Primitive: Colors / gray/gray700
      "800": "#26282c", // Primitive: Colors / gray/gray800
      "900": "#1a1a1a", // Primitive: Colors / gray/gray900
    },
    social: {
      kakao: "#fee500", // Primitive: Colors / social/kakao
      naver: "#03a94d", // Primitive: Colors / social/naver
    },
    opacity: {
      "5": "#0000000d", // Primitive: Colors / opacity/opacity5
      "10": "#0000001a", // Primitive: Colors / opacity/opacity10
      "15": "#00000026", // Primitive: Colors / opacity/opacity15
      "20": "#00000033", // Primitive: Colors / opacity/opacity20
      "25": "#00000040", // Primitive: Colors / opacity/opacity25
      "30": "#0000004d", // Primitive: Colors / opacity/opacity30
      "35": "#00000059", // Primitive: Colors / opacity/opacity35
      "40": "#00000066", // Primitive: Colors / opacity/opacity40
      "45": "#00000073", // Primitive: Colors / opacity/opacity45
      primaryOpacity50: "#5060c580", // Primitive: Colors / opacity/primary-opacity50
    },
    base: {
      white: "#ffffff", // Primitive: Colors / base/white
      black: "#000000", // Primitive: Colors / base/black
      stone: "#f7f7f8", // Primitive: Colors / base/stone
    },
  },
  number: {
    "0": "0px", // Primitive: Numbers / 0
    "2": "2px", // Primitive: Numbers / 2
    "4": "4px", // Primitive: Numbers / 4
    "6": "6px", // Primitive: Numbers / 6
    "8": "8px", // Primitive: Numbers / 8
    "10": "10px", // Primitive: Numbers / 10
    "12": "12px", // Primitive: Numbers / 12
    "16": "16px", // Primitive: Numbers / 16
    "20": "20px", // Primitive: Numbers / 20
    "24": "24px", // Primitive: Numbers / 24
    "28": "28px", // Primitive: Numbers / 28
    "32": "32px", // Primitive: Numbers / 32
    "40": "40px", // Primitive: Numbers / 40
    "48": "48px", // Primitive: Numbers / 48
    "60": "60px", // Primitive: Numbers / 60
    "80": "80px", // Primitive: Numbers / 80
    "100": "100px", // Primitive: Numbers / 100
  },
  typo: {
    font: {
      pretendard: "Pretendard", // Primitive: Typography / font/pretendard
    },
    size: {
      "10": "10px", // Primitive: Typography / size/10
      "12": "12px", // Primitive: Typography / size/12
      "14": "14px", // Primitive: Typography / size/14
      "16": "16px", // Primitive: Typography / size/16
      "18": "18px", // Primitive: Typography / size/18
      "20": "20px", // Primitive: Typography / size/20
      "24": "24px", // Primitive: Typography / size/24
      "28": "28px", // Primitive: Typography / size/28
      "32": "32px", // Primitive: Typography / size/32
      "48": "48px", // Primitive: Typography / size/48
    },
    weight: {
      regular: "400", // Primitive: Typography / weight/regular
      medium: "500", // Primitive: Typography / weight/medium
      semibold: "600", // Primitive: Typography / weight/semibold
      bold: "700", // Primitive: Typography / weight/bold
    },
    letterSpacing: {
      "0": "0px", // Primitive: Typography / letter-spacing/0
    },
    lineHeight: {
      "10": {
        "150": "15px", // Primitive: Typography / line-height/10/150
      },
      "12": {
        "150": "18px", // Primitive: Typography / line-height/12/150
      },
      "14": {
        "150": "21px", // Primitive: Typography / line-height/14/150
      },
      "16": {
        "150": "24px", // Primitive: Typography / line-height/16/150
        "160": "25.6px", // Primitive: Typography / line-height/16/160
      },
      "18": {
        "130": "23.4px", // Primitive: Typography / line-height/18/130
        "150": "27px", // Primitive: Typography / line-height/18/150
      },
      "20": {
        "130": "26px", // Primitive: Typography / line-height/20/130
      },
      "24": {
        "130": "31.2px", // Primitive: Typography / line-height/24/130
      },
      "28": {
        "130": "36.4px", // Primitive: Typography / line-height/28/130
      },
      "32": {
        "130": "41.6px", // Primitive: Typography / line-height/32/130
      },
      "48": {
        "130": "62.4px", // Primitive: Typography / line-height/48/130
      },
    },
  },
};

export const primitive = createGlobalThemeContract(values, (value: string | null, path: string[]) => `bud-${path.map((p) => p.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()).join('-')}`);

createGlobalTheme(':root', primitive, values);
