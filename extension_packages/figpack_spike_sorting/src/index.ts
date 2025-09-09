import { ZarrGroup } from "./figpack-plugin-interface/ZarrTypes";
import React from "react";
import { createRoot } from "react-dom/client";
import View from "./View";
import {
  FPViewContext,
  FPViewContexts,
} from "./figpack-plugin-interface/FPPluginInterface";
import { defaultUnitSelection } from "./views/context-unit-selection";
import {
  UnitSelection,
  unitSelectionReducer,
} from "./views/context-unit-selection/UnitSelectionContext";
import {
  UnitMetricSelection,
  unitMetricSelectionReducer,
} from "./views/context-unit-metrics-selection";

// Declare global types for figpack extension system
export {};

declare global {
  interface Window {
    figpackExtensions: Record<string, any>;
  }
}

const createUnitMetricSelectionContext = (): FPViewContext => {
  let state: UnitMetricSelection = {};
  const listeners: ((newValue: UnitMetricSelection) => void)[] = [];

  const dispatch = (action: any) => {
    state = unitMetricSelectionReducer(state, action);
    listeners.forEach((callback) => {
      callback(state);
    });
  };

  const onChange = (callback: (newValue: UnitMetricSelection) => void) => {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  };

  return {
    state,
    dispatch,
    onChange,
    createNew: createUnitMetricSelectionContext,
  };
};

const createUnitSelectionContext = (): FPViewContext => {
  let state: UnitSelection = defaultUnitSelection;
  const listeners: ((newValue: UnitSelection) => void)[] = [];

  const dispatch = (action: any) => {
    state = unitSelectionReducer(state, action);
    listeners.forEach((callback) => {
      callback(state);
    });
  };

  const onChange = (callback: (newValue: UnitSelection) => void) => {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  };

  return {
    state,
    dispatch,
    onChange,
    createNew: createUnitSelectionContext,
  };
};

// Register the figpack extension
window.figpackExtensions = window.figpackExtensions || {};

window.figpackExtensions["figpack-spike-sorting"] = {
  render: async function (a: {
    container: HTMLElement;
    zarrGroup: ZarrGroup;
    width: number;
    height: number;
    onResize: (callback: (width: number, height: number) => void) => void;
    contexts: FPViewContexts;
  }) {
    const { container, zarrGroup, width, height, onResize, contexts } = a;

    container.innerHTML = "";

    try {
      const root = createRoot(container);
      root.render(
        React.createElement(View, {
          zarrGroup,
          width,
          height,
          onResize,
          contexts,
        })
      );

      return {
        destroy: () => {
          root.unmount();
        },
      };
    } catch (error) {
      console.error("Error rendering Spike Sorting visualization:", error);
      this.renderError(container, width, height, (error as Error).message);
      return { destroy: () => {} };
    }
  },

  contextCreators: [
    { name: "unitSelection", create: createUnitSelectionContext },
    { name: "unitMetricSelection", create: createUnitMetricSelectionContext },
  ],

  renderError: function (
    container: HTMLElement,
    width: number,
    height: number,
    message: string
  ): void {
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

  joinPath: function (p1: string, p2: string): string {
    if (p1.endsWith("/")) p1 = p1.slice(0, -1);
    if (p2.startsWith("/")) p2 = p2.slice(1);
    return p1 + "/" + p2;
  },
};