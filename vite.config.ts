import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { cpSync, existsSync, statSync, createReadStream } from 'node:fs'
import { resolve } from 'node:path'

function dataPlugin(): Plugin {
  return {
    name: 'vite-plugin-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url?.split('?')[0] ?? ''
        let targetFile: string | null = null

        if (rawUrl.startsWith('/data/')) {
          targetFile = resolve(process.cwd(), rawUrl.slice(1))
        } else {
          const fallback = resolve(process.cwd(), 'data', rawUrl.slice(1))
          if (existsSync(fallback) && statSync(fallback).isFile()) {
            targetFile = fallback
          }
        }

        if (targetFile && existsSync(targetFile) && statSync(targetFile).isFile()) {
          if (targetFile.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
          } else if (targetFile.endsWith('.txt')) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          }
          createReadStream(targetFile).pipe(res)
          return
        }

        next()
      })
    },
    closeBundle() {
      const srcDir = resolve(process.cwd(), 'data')
      const destDir = resolve(process.cwd(), 'dist/data')
      if (existsSync(srcDir)) {
        cpSync(srcDir, destDir, { recursive: true })
      }
    },
  }
}

export default defineConfig({
  plugins: [vue(), dataPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
