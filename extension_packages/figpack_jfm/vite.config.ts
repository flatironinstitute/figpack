import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import react from "@vitejs/plugin-react";
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => {
  const isServe = command === 'serve';
  
  return {
    plugins: [react(), cssInjectedByJsPlugin()],
    root: __dirname,
    publicDir: 'figpack_jfm', // Serve files from the figpack_jfm directory
    server: {
      port: 5174,
      cors: true,
      fs: {
        allow: ['..']
      }
    },
    preview: {
      port: 5174,
      cors: true,
      open: false
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/index.tsx'),
        name: 'figpackjfm',
        formats: ['iife'],
        fileName: () => 'figpack_jfm.js'
      },
      outDir: 'figpack_jfm',
      emptyOutDir: false, // Don't clear the directory since it contains Python files
      rollupOptions: {
        output: {
          // Ensure all dependencies are bundled into the single file
          inlineDynamicImports: true,
        }
      },
      target: 'es2018', // Good browser compatibility
      minify: !isServe // Don't minify in dev mode for better debugging
    },
    define: {
      // Ensure process.env is defined for any dependencies that might need it
      'process.env.NODE_ENV': JSON.stringify(isServe ? 'development' : 'production')
    }
  };
});
