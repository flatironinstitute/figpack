TODO: integrate the figpack-main-plugin back into figpack-figure, as we now have the extension system and do not need plugins.

In the vite.config.ts files for the extension packages, we need to use the vite-plugin-css-injected-by-js plugin to ensure that the CSS is included in the .js file that is loaded by figpack.

