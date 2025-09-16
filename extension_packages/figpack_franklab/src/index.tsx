/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FunctionComponent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  FPViewComponent,
  FPViewContext,
  RenderParams,
  ZarrGroup,
} from "./figpack-interface";
import { FPTrackAnimation } from "./TrackAnimation/FPTrackAnimation";

// Declare global types for figpack extension system
export {};

// declare global {
//   interface Window {
//     figpackExtensions: Record<string, any>;
//   }
// }

// // Register the figpack extension
// window.figpackExtensions = window.figpackExtensions || {};

// window.figpackExtensions['figpack-franklab'] = {
//   render: async function(a: {container: HTMLElement, zarrGroup: ZarrGroup, width: number, height: number, onResize: (callback: (width: number, height: number) => void) => void, contexts: FPViewContexts}) {
//     const { container, zarrGroup, width, height, onResize, contexts } = a;

//     container.innerHTML = '';

//     try {
//       const root = createRoot(container);
//       root.render(
//         React.createElement(View, {
//           zarrGroup,
//           width,
//           height,
//           onResize,
//           contexts
//         })
//       );

//       return {
//         destroy: () => {
//           root.unmount();
//         }
//       };
//     } catch (error) {
//       console.error('Error rendering Frank Lab visualization:', error);
//       this.renderError(container, width, height, (error as Error).message);
//       return { destroy: () => {} };
//     }
//   },

//   renderError: function(container: HTMLElement, width: number, height: number, message: string): void {
//     container.innerHTML = `
//       <div style="
//         width: ${width}px;
//         height: ${height}px;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         background-color: #f8f9fa;
//         border: 1px solid #dee2e6;
//         color: #6c757d;
//         font-family: system-ui, -apple-system, sans-serif;
//         font-size: 14px;
//         text-align: center;
//         padding: 20px;
//         box-sizing: border-box;
//       ">
//         <div>
//           <div style="margin-bottom: 10px; font-weight: 500;">3D Scene Error</div>
//           <div style="font-size: 12px;">${message}</div>
//         </div>
//       </div>
//     `;
//   },

//   joinPath: function(p1: string, p2: string): string {
//     if (p1.endsWith('/')) p1 = p1.slice(0, -1);
//     if (p2.startsWith('/')) p2 = p2.slice(1);
//     return p1 + '/' + p2;
//   }
// };

type ComponentWrapperProps = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  onResize: (callback: (width: number, height: number) => void) => void;
  onDataChange: (callback: (zarrGroup: ZarrGroup) => void) => void;
  contexts: { [key: string]: FPViewContext };
  component: React.ComponentType<any>;
};

// eslint-disable-next-line react-refresh/only-export-components
const ComponentWrapper: FunctionComponent<ComponentWrapperProps> = ({
  zarrGroup,
  width,
  height,
  onResize,
  onDataChange,
  contexts,
  component: Component,
}) => {
  const [internalWidth, setInternalWidth] = useState(width);
  const [internalHeight, setInternalHeight] = useState(height);
  const [internalZarrGroup, setInternalZarrGroup] = useState(zarrGroup);

  useEffect(() => {
    onResize((newWidth, newHeight) => {
      setInternalWidth(newWidth);
      setInternalHeight(newHeight);
    });
    onDataChange((newZarrGroup) => {
      setInternalZarrGroup(newZarrGroup);
    });
  }, [onResize, onDataChange]);

  return (
    <Component
      zarrGroup={internalZarrGroup}
      width={internalWidth}
      height={internalHeight}
      contexts={contexts}
    />
  );
};

const makeRenderFunction = (Component: React.ComponentType<any>) => {
  return (a: RenderParams) => {
    const {
      container,
      zarrGroup,
      width,
      height,
      onResize,
      onDataChange,
      contexts,
    } = a;
    const root = createRoot(container);
    root.render(
      <ComponentWrapper
        zarrGroup={zarrGroup}
        width={width}
        height={height}
        onResize={onResize}
        onDataChange={onDataChange}
        contexts={contexts}
        component={Component}
      />,
    );
  };
};

const registerExtension = () => {
  const registerFPViewComponent: (v: FPViewComponent) => void = (window as any)
    .figpack_p1.registerFPViewComponent;
  registerFPViewComponent({
    name: "franklab.TrackAnimation",
    render: makeRenderFunction(FPTrackAnimation),
  });

  // const registerFPViewContextCreator: (c: FPViewContextCreator) => void = (window as any).figpack_p1.registerFPViewContextCreator;

  const registerFPExtension: (e: { name: string }) => void = (window as any)
    .figpack_p1.registerFPExtension;
  registerFPExtension({ name: "figpack-franklab" });
};

registerExtension();
