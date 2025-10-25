import adapter from '@sveltejs/adapter-auto';

const config = {
  kit: {
    adapter: adapter(),
    files: {
      routes: 'client/routes',
      lib: 'client'
    },
    alias: {
      '$lib': './shared',
      '$lib/shared': './shared',
      '$lib/client': './client',
      '$lib/server': './server'
    }
  }
};

export default config;
