import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { redirectBare } from './scripts/redirect-bare.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// Three separate pages, three separate bundles:
//   /        -> student site   (index.html)        no admin code inside
//   /admin/  -> admin site     (admin/index.html)  no student screens inside
//   /org/    -> org managers   (org/index.html)    only their own college's events
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'bare-admin-org-redirect', // /admin -> /admin/ , /org -> /org/
      // NOTE: these must return nothing — a returned function is treated by Vite as a "post" hook
      configureServer(server) {
        server.middlewares.use(redirectBare);
      },
      configurePreviewServer(server) {
        server.middlewares.use(redirectBare);
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        student: here('index.html'),
        admin: here('admin/index.html'),
        org: here('org/index.html'),
      },
    },
  },
});
