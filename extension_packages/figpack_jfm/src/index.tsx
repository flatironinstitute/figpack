/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FunctionComponent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FPEditableNotes from './EditableNotes/FPEditableNotes';
import { FPViewComponent, FPViewContext, RenderParams, ZarrGroup } from "./figpack-interface";

// Declare global types for figpack extension system
export { };

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

  return (<Component
      zarrGroup={internalZarrGroup}
      width={internalWidth}
      height={internalHeight}
      contexts={contexts}
    />
  );
};

const makeRenderFunction = (Component: React.ComponentType<any>) => {
  return (a: RenderParams) => {
    const { container, zarrGroup, width, height, onResize, onDataChange, contexts } = a;
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
      />
    );
  }
}

const registerExtension = () => {
  const registerFPViewComponent: (v: FPViewComponent) => void = (window as any).figpack_p1.registerFPViewComponent;
  registerFPViewComponent({
    name: "jfm.EditableNotes",
    render: makeRenderFunction(FPEditableNotes)
  })
  
  // const registerFPViewContextCreator: (c: FPViewContextCreator) => void = (window as any).figpack_p1.registerFPViewContextCreator;

  const registerFPExtension: (e: { name: string }) => void = (window as any).figpack_p1.registerFPExtension;
  registerFPExtension({ name: "figpack-jfm" });
}

registerExtension();
