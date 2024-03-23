import colorSchemes from "./colorschemes.json";
import colorSchemesBranding from "./colorschemes-branding.json";

const themes = [
  {
    name: "clean",
    extend: {
      fontFamily: {
        sans: ["Avenir", "sans-serif"],
        serif: ["Merriweather", "serif"]
      }
    }
  },
  {
    name: "Colorful",
    extend: {
      fontFamily: {
        sans: ["Roboto", "sans-serif"],
        serif: ["Merriweather", "serif"]
      }
    }
  }
];

const lightThemes = [
  {
    name: "cs_tidigit_light_blue",
    extend: {
      colors: colorSchemes.find(
        (cs) => cs.tailwindSelector === "cs_tidigit_light_blue"
      ).colors
    }
  },
  {
    name: "cs_tidigit_light_red",
    extend: {
      colors: colorSchemes.find(
        (cs) => cs.tailwindSelector === "cs_tidigit_light_red"
      ).colors
    }
  },
  {
    name: "cs_solarized_light",
    extend: {
      colors: colorSchemes.find(
        (cs) => cs.tailwindSelector === "cs_solarized_light"
      ).colors
    }
  },
  {
    name: "cs_tidigit_light",
    extend: {
      colors: colorSchemes.find(
        (cs) => cs.tailwindSelector === "cs_tidigit_light"
      ).colors
    }
  },
  {
    name: "cs_tidigit_light_iris",
    extend: {
      colors: colorSchemes.find(
        (cs) => cs.tailwindSelector === "cs_tidigit_light_iris"
      ).colors
    }
  }
];

const darkThemes = [
  {
    name: "cs_tidigit_dark_blue",
    extend: {
      colors: colorSchemes.find(
        (cs) => cs.tailwindSelector === "cs_tidigit_dark_blue"
      ).colors
    }
  },
  {
    name: "cs_tidigit_dark_red",
    extend: {
      colors: colorSchemes.find(
        (cs) => cs.tailwindSelector === "cs_tidigit_dark_red"
      ).colors
    }
  },
  {
    name: "cs_solarized_dark",
    extend: {
      colors: colorSchemes.find(
        (cs) => cs.tailwindSelector === "cs_solarized_dark"
      ).colors
    }
  },
  {
    name: "cs_tidigit_dark",
    extend: {
      colors: colorSchemes.find(
        (cs) => cs.tailwindSelector === "cs_tidigit_dark"
      ).colors
    }
  },
  {
    name: "cs_tidigit_dark_iris",
    extend: {
      colors: colorSchemes.find(
        (cs) => cs.tailwindSelector === "cs_tidigit_dark_iris"
      ).colors
    }
  }
];

module.exports = {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "3xl": "1800px"
    },
    extend: {
      fontSize: {
        title: "5rem",
        "2xl": "2.6rem",
        xl: "2.4rem",
        h1: "1.875rem",
        h2: "1.563rem",
        h3: "1.313rem",
        h4: "1.125rem",
        h5: "1rem",
        base: "1rem",
        b2: "0.9rem",
        b3: "0.8rem",
        b4: "0.7rem",
        b5: "0.6rem"
      },
      spacing: {
        // 12-grid system
        "1/12": "8.333333%",
        "2/12": "16.666667%",
        "3/12": "25%",
        "4/12": "33.333333%",
        "5/12": "41.666667%",
        "6/12": "50%",
        "7/12": "58.333333%",
        "8/12": "66.666667%",
        "9/12": "75%",
        "10/12": "83.333333%",
        "11/12": "91.666667%",

        // 10-grid system
        "1/10": "10%",
        "2/10": "20%",
        "3/10": "30%",
        "4/10": "40%",
        "5/10": "50%",
        "6/10": "60%",
        "7/10": "70%",
        "8/10": "80%",
        "9/10": "90%"
      }
    }
  },
  plugins: [
    require("tailwindcss-themer")({
      defaultTheme: {
        extend: {
          fontFamily: {
            sans: ["Roboto", "sans-serif"],
            serif: ["Merriweather", "serif"]
          },
          colors: lightThemes[0].colors,
          rotate: {
            270: "270deg"
          }
        }
      },
      themes: [
        ...themes,
        ...lightThemes,
        ...darkThemes,
        ...colorSchemesBranding
      ]
    })
  ]
};
