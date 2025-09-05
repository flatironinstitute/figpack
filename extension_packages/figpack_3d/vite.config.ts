import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
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
    minify: 'terser'
  },
  define: {
    // Ensure process.env is defined for any dependencies that might need it
    'process.env.NODE_ENV': JSON.stringify('production')
  }
});
