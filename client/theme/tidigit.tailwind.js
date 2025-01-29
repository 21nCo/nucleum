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

const mappedColorSchemes = colorSchemes.map((cs) => {
  return {
    name: cs.tailwindSelector,
    extend: {
      colors: cs.colors
    }
  };
});

module.exports = {
  content: ["./src/**/*.{html,js,svelte,ts}", "./lib/**/*.{html,js,svelte,ts}"],
  theme: {
    screens: {
      /**
       * @deprecated
       */
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",

      portrait: { raw: "(orientation: portrait)" },
      landscape: { raw: "(orientation: landscape)" },
      /**
       * Mobile devices
       */
      mo: { raw: "(max-width: 600px) and (max-height: 1000px)" },
      /**
       * Non-touch devices (devices that can hover)
       */
      notouch: { raw: "(hover: hover) and (pointer: fine)" },
      /**
       * Tablet in portrait, or vertical splits on laptop/desktop/tablet in landscape
       */
      tp: { raw: "(min-width: 600px) and (min-height: 500px)" },
      /**
       * Bigger tablets in landscape, entry laptops
       */
      lp: { raw: "(min-width: 1024px) and (min-height: 700px)" },
      /**
       * Desktop and bigger laptops
       */
      dp: { raw: "(min-width: 1500px) and (min-height: 700px)" },
      /**
       * 2k : 2K monitors and above, TVs etc
       */
      "2k": { raw: "(min-width: 2000px) and (min-height: 1000px)" },
      /**
       * Constrained width: handheld devices like phones, vertical narrow splits on desktop/laptop/tablet
       */
      cw: { raw: "(max-width: 600px)" },
      /**
       * Ultra wide
       */
      uw: "4000px",
      /**
       * Constrained height: Horizontal splits on desktop/laptop/tablet or when opened from laptop browser with too many toolbars i.e. tab bar, bookmark bar, address bar, system menu bar etc
       */
      ch: { raw: "(max-height: 600px)" },
      /**
       * Vertical monitor
       */
      vm: { raw: "(min-height: 1500px)" }
    },
    extend: {
      backgroundImage: {
        dividerHorizontal:
          "linear-gradient(90deg, rgba(209, 208, 208, 0.18) 0%, #D1D0D0 50.5%, rgba(209, 208, 208, 0.16) 100%)"
      },
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
      },
      animation: {
        "bounce-r": "bounce-r 0.3s ease-in-out",
        "bounce-l": "bounce-l 0.3s ease-in-out",
        "pulse-subtle":
          "pulse-subtle 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-down": "slide-down 0.5s ease-in-out forwards",
        "slide-up": "slide-up 0.5s ease-in-out forwards",
        "open-left": "open-left 0.3s ease-in-out forwards",
        "open-right": "open-right 0.3s ease-in-out forwards",
        "close-right": "close-right 0.3s ease-in-out forwards",
        rotate45: "rotate45 0.2s forwards",
        fadeIn: "fadeIn 1s forwards",
        fadeOut: "fadeOut 0.2s forwards"
      },
      keyframes: {
        "bounce-r": {
          "40%": { transform: "translateX(10px)" },
          "60%": { transform: "translateX(5px)" },
          "100%": { transform: "translateX(0px)" }
        },
        "bounce-l": {
          "40%": { transform: "translateX(-10px)" },
          "60%": { transform: "translateX(-5px)" },
          "100%": { transform: "translateX(0px)" }
        },
        "pulse-subtle": {
          "0%, 100%": { filter: "saturate(80%)" },
          "50%": { filter: "saturate(120%)" }
        },
        "slide-down": {
          "0%": { height: "0", opacity: "0" },
          "100%": { height: "100%", opacity: "1" }
        },
        "slide-up": {
          "0%": { height: "100%", opacity: "1" },
          "100%": { height: "0", opacity: "0" }
        },
        "open-left": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0%)", opacity: "1" }
        },
        "open-right": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0%)", opacity: "1" }
        },
        "close-right": {
          "0%": { transform: "translateX(0%)", opacity: "1" },
          "100%": { transform: "translateX(100%)", opacity: "0" }
        },
        rotate45: {
          "0%": {
            transform: "rotate(0deg)"
          },
          "100%": {
            transform: "rotate(45deg)"
          }
        },
        fadeIn: {
          "0%": {
            opacity: 0
          },
          "100%": {
            opacity: 1
          }
        },
        fadeOut: {
          "0%": {
            opacity: 1
          },
          "100%": {
            opacity: 0
          }
        }
      }
    }
  },
  darkMode: "selector",
  purge: {
    content: ["./lib/**/*.html", "./lib/**/*.svelte"],
    options: {
      safelist: [
        "cs_dracula",
        "cs_dim",
        "cs_tidigit_light",
        "cs_tidigit_light_blue",
        "cs_tidigit_light_iris",
        "cs_tidigit_light_red",
        "cs_tidigit_light_apple",
        "cs_tidigit_light_oxide",
        "cs_tidigit_dark",
        "cs_tidigit_dark_blue",
        "cs_tidigit_dark_red",
        "cs_tidigit_dark_bw",
        "cs_tidigit_dark_iris",
        "cs_tidigit_dark_green",
        "cs_tidigit_dark_apple",
        "cs_tidigit_dark_oxide",
        "cs_solarized_light",
        "cs_solarized_dark",
        "border-brs1",
        "border-brs2",
        "border-brs3",
        "border-aps1",
        "border-ccs1",
        "bg-ccs1",
        "bg-ccs2",
        "bg-ccs3",
        "bg-ccs4",
        "bg-ccs5",
        "styledscroll",
        "cursor-col-resize",
        "cursor-row-resize",
        "text-abg",
        {
          pattern: /(from|via|to)-(.+)/
        }
        // {
        //   pattern: /ph--.*/
        // },
        // /^theme_/,
        // /^cs_.*$/,
        // /^bg-/,
        // /^text-/
      ]
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
          colors: mappedColorSchemes[0].colors,
          rotate: {
            270: "270deg"
          }
        }
      },
      themes: [
        ...themes,
        ...mappedColorSchemes,
        // ...lightThemes,
        // ...darkThemes,
        ...colorSchemesBranding
      ]
    })
    // require("@iconify/tailwind").addIconSelectors({
    //   prefixes: ["ph"]
    // }
    // )
  ]
};
