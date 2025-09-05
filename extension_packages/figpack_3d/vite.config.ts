import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => {
  const isServe = command === 'serve';
  
  return {
    root: __dirname,
    publicDir: 'figpack_3d', // Serve files from the figpack_3d directory
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
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'figpack3d',
        formats: ['iife'],
        fileName: () => 'figpack_3d.js'
      },
      outDir: 'figpack_3d',
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
