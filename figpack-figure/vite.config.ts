/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from 'rollup-plugin-visualizer'
import path from "path";

const plugins: any[] = [react()];
if (process.env.ANALYZE) {
  plugins.push(visualizer({ open: true }));
}

// https://vite.dev/config/
export default defineConfig({
  plugins,
  base: "./",
  build: {
    outDir: "../figpack/figpack-figure-dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "./src/components"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      // Force all packages to use the same React instance
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
});
