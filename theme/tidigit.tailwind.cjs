const { dark, dim, dracula, sea, forest, light, smooth, grainy } = require('./colors.cjs')


const defaultFontSize = {
    'h1': '1.953rem',
    'h2': '1.25rem',
    'b0': '1.1rem',
    base: '1rem',
    'b2': '0.8rem',
    'b3': '0.7rem',
    '4xl': '2.441rem',
    '5xl': '3.052rem',
}

const themes = [
    {
        name: 'clean',
        extend: {
            fontFamily: {
                sans: ['Avenir', 'sans-serif'],
                serif: ['Merriweather', 'serif'],
            },
        },
    },
    {
        name: "Colorful",
        extend: {
            fontFamily: {
                sans: ['Roboto', 'sans-serif'],
                serif: ['Merriweather', 'serif'],
            },
        }
    },
]

const scales = [
    {
        name: 'tiny',
        extend: {
            fontSize: {
                'h1': '1.5rem',
                'h2': '0.75rem',
                base: '0.5rem',
                'b2': '0.4rem',
                'b3': '0.3rem',
                '4xl': '2rem',
                '5xl': '2.5rem',
            }
        }
    },
    {
        name: 'small',
        extend: {
            fontSize: {
                'h1': '1.8rem',
                'h2': '1rem',
                base: '0.8rem',
                'b2': '0.6rem',
                'b3': '0.5rem',
                '4xl': '2rem',
                '5xl': '2.5rem',
            }
        }
    },
    {
        name: 'default',
        extend: {
            fontSize: defaultFontSize
        }
    },
    {
        name: 'large',
        extend: {
            fontSize: {
                'h1': '2.1rem',
                'h2': '1.5rem',
                base: '1.2rem',
                'b2': '1rem',
                'b3': '0.8rem',
                '4xl': '2.8rem',
                '5xl': '3.4rem',
            }
        }
    },
    {
        name: 'extralarge',
        extend: {
            fontSize: {
                'h1': '2.2rem',
                'h2': '1.6rem',
                base: '1.3rem',
                'b2': '1rem',
                'b3': '0.8rem',
                '4xl': '3rem',
                '5xl': '3.7rem',
            }
        }
    }
]




const lightThemes = [
    {
        name: 'light',
        extend: {
            colors: light
        }
    },
    {
        name: 'smooth',
        extend: {
            colors: smooth
        }
    },
    {
        name: 'grainy',
        extend: {
            colors: grainy
        }
    },
    {
        name: 'DEF5E5',
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
                accent2: "#FFF4D2"
            }
        }
    },
    {
        name: 'EEF1FF',
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
                accent2: "#FFF4D2"
            }
        }
    },
    {
        name: 'FBF8F1',
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
                accent2: "#FFF4D2"
            }
        }
    },
    {
        name: 'F0ECE3',
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
                accent2: "#FFF4D2"
            }
        }
    },
]


const darkThemes = [
    {
        name: 'dracula',
        extend: {
            colors: dracula
        }
    },
    {
        name: 'three',
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
                accent2: "#dbcfc1"
            }
        }
    },
    {
        name: 'dark',
        extend: {
            colors: dark
        }
    },
    {
        name: 'wood',
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
                accent2: "#dbcfc1"
            }
        }
    },
    {
        name: 'forest',
        extend: {
            colors: forest
        }
    },
    {
        name: 'sea',
        extend: {
            colors: sea
        }
    },
    {
        name: 'dim',
        extend: {
            colors: dim
        }
    },
]

module.exports = {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
        },
    },
    plugins: [require('tailwindcss-themer')({
        defaultTheme: {
            extend: {
                fontFamily: {
                    sans: ['Roboto', 'sans-serif'],
                    serif: ['Merriweather', 'serif'],
                },
                colors: light,
                rotate: {
                    '270': '270deg',
                }
            }
        },
        themes: [...themes, ...scales,
        ...lightThemes, ...darkThemes,
        ]
    })],
}