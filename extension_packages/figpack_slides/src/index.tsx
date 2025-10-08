/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FunctionComponent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import FPSlide from "./views/Slide/FPSlide";
import FPSlides from "./views/Slides/FPSlides";
import FPTitleSlideContent from "./views/TitleSlideContent/FPTitleSlideContent";
import {
  FPViewComponent,
  FPViewContext,
  RenderParams,
  ZarrGroup,
} from "./figpack-interface";

// Declare global types for figpack extension system
export {};

type ComponentWrapperProps = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  onResize: (callback: (width: number, height: number) => void) => void;
  onDataChange: (callback: (zarrGroup: ZarrGroup) => void) => void;
  contexts: { [key: string]: FPViewContext };
  component: React.ComponentType<any>;
  renderFPView: (params: RenderParams) => void;
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
  renderFPView,
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
      renderFPView={renderFPView}
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
      renderFPView,
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
        renderFPView={renderFPView}
      />,
    );
  };
};

const registerExtension = () => {
  // Register view components
  const registerFPViewComponent: (v: FPViewComponent) => void = (window as any)
    .figpack_p1.registerFPViewComponent;
  registerFPViewComponent({
    name: "slides.Slides",
    render: makeRenderFunction(FPSlides),
  });
  registerFPViewComponent({
    name: "slides.Slide",
    render: makeRenderFunction(FPSlide),
  });
  registerFPViewComponent({
    name: "slides.TitleSlideContent",
    render: makeRenderFunction(FPTitleSlideContent),
  });

  // Register extension
  const registerFPExtension: (e: { name: string }) => void = (window as any)
    .figpack_p1.registerFPExtension;
  registerFPExtension({ name: "figpack-slides" });
};

registerExtension();
