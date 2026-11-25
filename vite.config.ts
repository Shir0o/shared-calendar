import { sentryVitePlugin } from '@sentry/bundler-plugins/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: sentryAuthToken ? 'hidden' : false,
  },
  plugins: [
    react(),
    tailwindcss(),
    // Must come last so source maps cover all transforms; skipped when SENTRY_AUTH_TOKEN is unset.
    ...(sentryAuthToken
      ? [
          sentryVitePlugin({
            org: 'church-in-santa-ana',
            project: 'lattice-web',
            authToken: sentryAuthToken,
            sourcemaps: {
              filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
          }),
        ]
      : []),
  ],
})
