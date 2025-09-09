import { ZarrGroup } from "./figpack-plugin-interface/ZarrTypes";
import React from 'react';
import { createRoot } from 'react-dom/client';
import View from './View';

// Declare global types for figpack extension system
export {};

declare global {
  interface Window {
    figpackExtensions: Record<string, any>;
  }
}

// Register the figpack extension
window.figpackExtensions = window.figpackExtensions || {};

window.figpackExtensions['figpack-franklab'] = {
  render: async function(a: {container: HTMLElement, zarrGroup: ZarrGroup, width: number, height: number, onResize: (callback: (width: number, height: number) => void) => void}) {
    const { container, zarrGroup, width, height, onResize } = a;

    container.innerHTML = '';
    
    try {
      const root = createRoot(container);
      root.render(
        React.createElement(View, {
          zarrGroup,
          width,
          height,
          onResize
        })
      );
      
      return {
        destroy: () => {
          root.unmount();
        }
      };
    } catch (error) {
      console.error('Error rendering Frank Lab visualization:', error);
      this.renderError(container, width, height, (error as Error).message);
      return { destroy: () => {} };
    }
  },

  renderError: function(container: HTMLElement, width: number, height: number, message: string): void {
    container.innerHTML = `
      <div style="
        width: ${width}px; 
        height: ${height}px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        background-color: #f8f9fa; 
        border: 1px solid #dee2e6; 
        color: #6c757d;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        text-align: center;
        padding: 20px;
        box-sizing: border-box;
      ">
        <div>
          <div style="margin-bottom: 10px; font-weight: 500;">3D Scene Error</div>
          <div style="font-size: 12px;">${message}</div>
        </div>
      </div>
    `;
  },

  joinPath: function(p1: string, p2: string): string {
    if (p1.endsWith('/')) p1 = p1.slice(0, -1);
    if (p2.startsWith('/')) p2 = p2.slice(1);
    return p1 + '/' + p2;
  }
};
