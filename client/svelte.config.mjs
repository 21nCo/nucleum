import preprocess from "svelte-preprocess"

const config = {
  preprocess: preprocess({
    typescript: true
  }),
  compilerOptions: {
    css: "injected"
  }
}

export default config
