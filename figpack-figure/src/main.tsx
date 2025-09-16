/* eslint-disable @typescript-eslint/no-explicit-any */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import {
  FPViewContextCreator,
  FPViewComponent,
  FPViewContext,
} from "./figpack-interface.ts";
import { registerMainPlugin } from "@figpack/main-plugin";
import { FPView } from "@components/FPView.tsx";
import { BrowserRouter } from "react-router-dom";
import {
  figureAnnotationsReducer,
  FigureAnnotationsState,
  initialFigureAnnotationsState,
} from "./figureAnnotationsContext.ts";

export const registeredFPViewComponents: FPViewComponent[] = [];

const registerFPViewComponent = (view: FPViewComponent) => {
  for (const v of registeredFPViewComponents) {
    if (v.name === view.name) {
      console.warn(
        `View component ${view.name} is already registered. Skipping.`,
      );
      return;
    }
  }
  console.info("Registered view component:", view.name);
  registeredFPViewComponents.push(view);
};

export const registeredFPViewContextCreators: FPViewContextCreator[] = [];

const registerFPViewContextCreator = (contextCreator: FPViewContextCreator) => {
  for (const c of registeredFPViewContextCreators) {
    if (c.name === contextCreator.name) {
      console.warn(
        `View context creator ${contextCreator.name} is already registered. Skipping.`,
      );
      return;
    }
  }
  console.info("Registered view context creator:", contextCreator.name);
  registeredFPViewContextCreators.push(contextCreator);
};

export const registeredFPExtensions: {
  name: string;
}[] = [];

const registerFPExtension = (extension: { name: string }) => {
  for (const e of registeredFPExtensions) {
    if (e.name === extension.name) {
      console.warn(
        `Extension ${extension.name} is already registered. Skipping.`,
      );
      return;
    }
  }
  console.info("Registered extension:", extension.name);
  registeredFPExtensions.push(extension);
};

const createFigureAnnotationsContext = (): FPViewContext => {
  const stateRef: { current: FigureAnnotationsState } = {
    current: initialFigureAnnotationsState,
  };
  const listeners: ((newValue: FigureAnnotationsState) => void)[] = [];

  const dispatch = (action: any) => {
    stateRef.current = figureAnnotationsReducer(stateRef.current, action);
    listeners.forEach((callback) => {
      callback(stateRef.current);
    });
  };

  const onChange = (callback: (newValue: FigureAnnotationsState) => void) => {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  };

  return {
    stateRef,
    dispatch,
    onChange,
    createNew: createFigureAnnotationsContext,
  };
};

registerFPViewContextCreator({
  name: "figureAnnotations",
  create: createFigureAnnotationsContext,
});

// interface FigureAnnotations {
//   getItem: (key: string) => string | undefined;
//   setItem?: (key: string, value: string | undefined) => void;
//   onItemChanged: (key: string, callback: (value: string) => void) => () => void;
// }

// export class InMemoryFigureAnnotations implements FigureAnnotations {
//   private items: { [key: string]: string } = {};
//   private _callbacks: Map<string, Set<(value: string) => void>>;
//   private _allItemsCallbacks: Set<
//     (allItems: { [key: string]: string }) => void
//   >;

//   constructor() {
//     this._callbacks = new Map();
//     this._allItemsCallbacks = new Set();
//   }
//   getItem(key: string): string | undefined {
//     return this.items[key];
//   }
//   setItem(key: string, value: string | undefined): void {
//     if (value === undefined) {
//       delete this.items[key];
//     } else {
//       this.items[key] = value;
//     }
//     const cbs = this._callbacks.get(key);
//     if (cbs && value !== undefined) {
//       for (const cb of cbs) {
//         try {
//           cb(value);
//         } catch (e) {
//           console.error("Error in annotation callback:", e);
//         }
//       }
//     }
//     for (const cb of this._allItemsCallbacks) {
//       try {
//         cb(this.items);
//       } catch (e) {
//         console.error("Error in items changed callback:", e);
//       }
//     }
//   }
//   onItemChanged(key: string, callback: (value: string) => void): () => void {
//     let cbs = this._callbacks.get(key);
//     if (!cbs) {
//       cbs = new Set();
//       this._callbacks.set(key, cbs);
//     }
//     cbs.add(callback);
//     return () => {
//       cbs!.delete(callback);
//     };
//   }
//   onItemsChanged(
//     callback: (allItems: { [key: string]: string }) => void,
//   ): () => void {
//     this._allItemsCallbacks.add(callback);
//     return () => {
//       this._allItemsCallbacks.delete(callback);
//     };
//   }
//   getAllItems(): { [key: string]: string } {
//     return this.items;
//   }
//   setAllItems(items: { [key: string]: string }): void {
//     // include both old and new keys
//     const allKeys = new Set<string>([
//       ...Object.keys(this.items),
//       ...Object.keys(items),
//     ]);
//     this.items = { ...items }; // make a copy
//     for (const key of allKeys) {
//       const cbs = this._callbacks.get(key);
//       if (cbs) {
//         for (const cb of cbs) {
//           try {
//             cb(this.items[key] || ""); // seems the `|| ""` is important here
//           } catch (e) {
//             console.error("Error in annotation callback:", e);
//           }
//         }
//       }
//     }
//     for (const cb of this._allItemsCallbacks) {
//       try {
//         cb(this.items);
//       } catch (e) {
//         console.error("Error in items changed callback:", e);
//       }
//     }
//   }
// }

// export const figureAnnotations = new InMemoryFigureAnnotations();

(window as any).figpack_p1 = {
  registerFPViewComponent,
  registerFPViewContextCreator,
  registerFPExtension,
  registeredFPViewComponents,
  registeredFPViewContextCreators,
  registeredFPExtensions,
  // figureAnnotations,
};

registerMainPlugin(FPView);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
