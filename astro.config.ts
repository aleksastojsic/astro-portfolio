import { defineConfig } from 'astro/config';
import { siteConfig } from './src/config/site.config';
import { targetBlank } from './src/plugins/targetBlank';
import { imageService } from '@unpic/astro/service';
import mdx from '@astrojs/mdx';
import expressiveCode from 'astro-expressive-code';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  experimental: {
    svg: {
      mode: 'sprite',
    },
  },
  site: import.meta.env.PROD ? siteConfig.url : 'http://localhost:3000',
  server: {
    port: 3000,
  },
  trailingSlash: 'always', // or 'never', 'ignore'
  markdown: {
    rehypePlugins: [[targetBlank, { domain: import.meta.env.PROD ? siteConfig.url : 'http://localhost:3000' }]],
  },
  image: {
    service: imageService({
      // This can usually be auto-detected
      fallbackService: 'astro',
      placeholder: 'blurhash',
      // This is the default
      layout: 'constrained',
    }),
  },
  integrations: [
    icon(),
    sitemap({
      filter: (page) => page !== `${siteConfig.url}/admin/`,
    }),
    compress({
      CSS: true,
      HTML: {
        'html-minifier-terser': {
          removeAttributeQuotes: false,
        },
      },
      Image: false,
      JavaScript: true,
      SVG: false,
      Logger: 1,
    }),
    expressiveCode({
      themes: ['one-dark-pro', 'one-light'],
      themeCssSelector: (theme) => (theme.name === 'one-dark-pro' ? '.dark' : ':root:not(.dark)'),
    }),
    mdx(),
  ],
});
