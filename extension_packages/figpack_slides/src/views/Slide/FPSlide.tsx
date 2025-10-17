import React, { useMemo } from "react";
import {
  FPViewContexts,
  RenderParams,
  ZarrGroup,
} from "../../figpack-interface";
import FPViewWrapper from "../../FPViewWrapper";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
  renderFPView: (params: RenderParams) => void;
};

type TitleConfig = {
  text: string;
  font_size?: number;
  font_family?: string;
  color?: string;
} | null;

type HeaderConfig = {
  height: number;
  background_color: string;
} | null;

type FooterConfig = {
  height: number;
  background_color: string;
} | null;

const FPSlide: React.FC<Props> = ({
  zarrGroup,
  width,
  height,
  renderFPView,
  contexts,
}) => {
  const title = useMemo(
    () => zarrGroup.attrs["title"] as TitleConfig,
    [zarrGroup],
  );
  const hideTitle = useMemo(
    () => zarrGroup.attrs["hide_title"] as boolean | undefined,
    [zarrGroup],
  );
  const header = useMemo(
    () => zarrGroup.attrs["header"] as HeaderConfig,
    [zarrGroup],
  );
  const footer = useMemo(
    () => zarrGroup.attrs["footer"] as FooterConfig,
    [zarrGroup],
  );
  const backgroundColor = useMemo(
    () => zarrGroup.attrs["background_color"] as string | undefined,
    [zarrGroup],
  );

  const contentGroup = useContentGroup(zarrGroup);

  const showTitle = title && !hideTitle;

  // Calculate heights
  const headerHeight = header?.height || 0;
  const footerHeight = footer?.height || 0;
  const titleFontSize = showTitle ? title?.font_size || 32 : 0;
  const titleMargin = showTitle ? 20 : 0;
  const titleHeight = title ? titleFontSize + titleMargin : 0; // Font size plus margin
  const contentPadding = 40; // 20px on each side

  // Content area is everything except header and footer
  const contentAreaHeight = height - headerHeight - footerHeight;

  // View wrapper gets remaining space after title and padding
  const viewWrapperHeight = contentAreaHeight - titleHeight - contentPadding;

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      {header && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height: headerHeight,
            backgroundColor: header.background_color,
          }}
        />
      )}

      {/* Content Area Background */}
      <div
        style={{
          position: "absolute",
          top: headerHeight,
          left: 0,
          width,
          height: contentAreaHeight,
          backgroundColor: backgroundColor || "white",
        }}
      />

      {/* Title */}
      {title && showTitle && (
        <div
          style={{
            position: "absolute",
            top: headerHeight + contentPadding / 2,
            left: contentPadding / 2,
            width: width - contentPadding,
            height: titleFontSize,
            fontSize: `${titleFontSize}px`,
            fontFamily: title.font_family || undefined,
            color: title.color || undefined,
          }}
        >
          {title.text}
        </div>
      )}

      {/* Content View */}
      {contentGroup && (
        <div
          style={{
            position: "absolute",
            top: headerHeight + titleHeight + contentPadding / 2,
            left: contentPadding / 2,
            width: width - contentPadding,
            height: viewWrapperHeight,
            overflow: "hidden",
          }}
        >
          <FPViewWrapper
            zarrGroup={contentGroup}
            width={width - contentPadding}
            height={viewWrapperHeight}
            contexts={contexts}
            renderFPView={renderFPView}
          />
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div
          style={{
            position: "absolute",
            top: height - footerHeight,
            left: 0,
            width,
            height: footerHeight,
            backgroundColor: footer.background_color,
          }}
        />
      )}
    </div>
  );
};

const useContentGroup = (zarrGroup: ZarrGroup): ZarrGroup | null => {
  const [contentGroup, setContentGroup] = React.useState<ZarrGroup | null>(
    null,
  );

  React.useEffect(() => {
    const loadContentGroup = async () => {
      const group = await zarrGroup.getGroup("content");
      setContentGroup(group || null);
    };
    loadContentGroup();
  }, [zarrGroup]);

  return contentGroup;
};

export default FPSlide;
