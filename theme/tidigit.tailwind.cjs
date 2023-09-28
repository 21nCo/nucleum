const {
  dark,
  dim,
  dracula,
  sea,
  forest,
  light,
  smoothy,
  grainy,
  solarized,
} = require("./colors.cjs");

const defaultFontSize = {
  title: "3rem",
  "2xl": "2.6rem",
  xl: "2.4rem",
  h1: "2.1rem",
  h2: "1.8rem",
  h3: "1.5rem",
  base: "1rem",
  b2: "0.9rem",
  b3: "0.8rem",
  b4: "0.7rem",
  b5: "0.6rem",
};

const themes = [
  {
    name: "clean",
    extend: {
      fontFamily: {
        sans: ["Avenir", "sans-serif"],
        serif: ["Merriweather", "serif"],
      },
    },
  },
  {
    name: "Colorful",
    extend: {
      fontFamily: {
        sans: ["Roboto", "sans-serif"],
        serif: ["Merriweather", "serif"],
      },
    },
  },
];

const scales = [
  {
    name: "tiny",
    extend: {
      fontSize: {
        title: "2rem",
        "2xl": "2.2rem",
        xl: "2rem",
        h1: "1.8rem",
        h2: "1.4rem",
        h3: "1rem",
        base: "0.8rem",
        b2: "0.6rem",
        b3: "0.5rem",
        b4: "0.45rem",
        b5: "0.4rem",
      },
    },
  },
  {
    name: "small",
    extend: {
      fontSize: {
        title: "2rem",
        "2xl": "2.5rem",
        xl: "2.2rem",
        h1: "2rem",
        h2: "1.6rem",
        h3: "1.3rem",
        base: "1rem",
        b2: "0.8rem",
        b3: "0.7rem",
        b4: "0.6rem",
        b5: "0.5rem",
      },
    },
  },
  {
    name: "medium",
    extend: {
      fontSize: defaultFontSize,
    },
  },
  {
    name: "large",
    extend: {
      fontSize: {
        title: "3.5rem",
        "2xl": "2.8rem",
        xl: "2.6rem",
        h1: "2.4rem",
        h2: "2rem",
        h3: "1.7rem",
        base: "1.5rem",
        b2: "1.2rem",
        b3: "1rem",
        b4: "0.9rem",
        b5: "0.8rem",
      },
    },
  },
  {
    name: "huge",
    extend: {
      fontSize: {
        title: "4rem",
        "2xl": "3rem",
        xl: "2.8rem",
        h1: "2.5rem",
        h2: "2.2rem",
        h3: "2rem",
        base: "1.7rem",
        b2: "1.5rem",
        b3: "1.2rem",
        b4: "1rem",
        b5: "0.9rem",
      },
    },
  },
];

const lightThemes = [
  {
    name: "light",
    extend: {
      colors: light,
    },
  },
  {
    name: "smoothy",
    extend: {
      colors: smoothy,
    },
  },
  {
    name: "grainy",
    extend: {
      colors: grainy,
    },
  },
  {
    name: "solarized",
    extend: {
      colors: solarized,
    },
  },
  {
    name: "blank",
    extend: {
      colors: {
        bgs1: "#000000",
        bgs2: "#0f0f0f",
        bgs3: "#202020",
        bgs4: "#202020",
        fgs1: "#F3F3F3",
        fgs2: "#CACACA",
        fgs3: "#D0D0D0",
        accent1: "#fa7089",
        accent3: "#AE4EDE",
        accent2: "#6566f1",
      },
    },
  },
  {
    name: "dapien",
    extend: {
      colors: {
        bgs1: "#FCFCFC",
        bgs2: "#F2F2F2",
        bgs3: "#E6E6E6",
        bgs4: "#D9D9D9",
        fgs1: "#383838",
        fgs2: "#545454",
        fgs3: "#A8A8A8",
        fgs4: "#C4C4C4",
        accent1: "#47ccd9",
        accent2: "#ad6c6c",
        red: "#f77272",
        green: "#4fbd88",
      },
    },
  },
  {
    name: "dapienlanding",
    extend: {
      colors: {
        bgs1: "#FAFFFE",
        bgs2: "#EFF5F4",
        bgs3: "#E6E6E6",
        bgs4: "#D9D9D9",
        fgs1: "#383838",
        fgs2: "#545454",
        fgs3: "#A8A8A8",
        fgs4: "#C4C4C4",
        accent1: "#47ccd9",
        accent2: "#ad6c6c",
        red: "#f77272",
        green: "#4fbd88",
      },
    },
  },
  {
    name: "DEF5E5",
    extend: {
      colors: {
        bgs1: "#DEF5E5",
        bgs2: "#BCEAD5",
        bgs3: "#9ED5C5",
        bgs4: "#97BAC4",
        fgs1: "#003947",
        fgs2: "#003D4D",
        fgs3: "#003D4D",
        accent1: "#8EC3B0",
        accent2: "#FFF4D2",
      },
    },
  },
  {
    name: "EEF1FF",
    extend: {
      colors: {
        bgs1: "#EEF1FF",
        bgs2: "#D2DAFF",
        bgs3: "#AAC4FF",
        bgs4: "#97BAC4",
        fgs1: "#003947",
        fgs2: "#003D4D",
        fgs3: "#003D4D",
        accent1: "#B1B2FF",
        accent2: "#FFF4D2",
      },
    },
  },
  {
    name: "FBF8F1",
    extend: {
      colors: {
        bgs1: "#FBF8F1",
        bgs2: "#F7ECDE",
        bgs3: "#E9DAC1",
        bgs4: "#97BAC4",
        fgs1: "#003947",
        fgs2: "#003D4D",
        fgs3: "#003D4D",
        accent1: "#54BAB9",
        accent2: "#FFF4D2",
      },
    },
  },
  {
    name: "F0ECE3",
    extend: {
      colors: {
        bgs1: "#F0ECE3",
        bgs2: "#DFD3C3",
        bgs3: "#C7B198",
        bgs4: "#97BAC4",
        fgs1: "#003947",
        fgs2: "#003D4D",
        fgs3: "#003D4D",
        accent1: "#A68DAD",
        accent2: "#FFF4D2",
      },
    },
  },
];

const darkThemes = [
  {
    name: "dracula",
    extend: {
      colors: dracula,
    },
  },
  {
    name: "three",
    extend: {
      colors: {
        bgs1: "#371B58",
        bgs2: "#4C3575",
        bgs3: "#5B4B8A",
        bgs4: "#7858A6",
        fgs1: "#F3F3F3",
        fgs2: "#CACACA",
        fgs3: "#D0D0D0",
        accent1: "#9147E6",
        accent2: "#dbcfc1",
      },
    },
  },
  {
    name: "dark",
    extend: {
      colors: dark,
    },
  },
  {
    name: "wood",
    extend: {
      colors: {
        bgs1: "#472D2D",
        bgs2: "#553939",
        bgs3: "#704F4F",
        bgs4: "#A77979",
        fgs1: "#F3F3F3",
        fgs2: "#CACACA",
        fgs3: "#D0D0D0",
        accent1: "#D48585",
        accent2: "#dbcfc1",
      },
    },
  },
  {
    name: "forest",
    extend: {
      colors: forest,
    },
  },
  {
    name: "sea",
    extend: {
      colors: sea,
    },
  },
  {
    name: "dim",
    extend: {
      colors: dim,
    },
  },
];

module.exports = {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {},
  },
  plugins: [
    require("tailwindcss-themer")({
      defaultTheme: {
        extend: {
          fontFamily: {
            sans: ["Roboto", "sans-serif"],
            serif: ["Merriweather", "serif"],
          },
          colors: light,
          rotate: {
            270: "270deg",
          },
        },
      },
      themes: [...themes, ...scales, ...lightThemes, ...darkThemes],
    }),
  ],
};
