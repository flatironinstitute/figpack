import React, { useMemo } from "react";
import { FPViewContexts, ZarrGroup } from "../../figpack-interface";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
};

type TextConfig = {
  text: string;
  font_size?: number;
  font_family?: string;
  color?: string;
} | null;

const FPTitleSlideContent: React.FC<Props> = ({ zarrGroup, width, height }) => {
  const title = useMemo(
    () => zarrGroup.attrs["title"] as TextConfig,
    [zarrGroup],
  );
  const subtitle = useMemo(
    () => zarrGroup.attrs["subtitle"] as TextConfig,
    [zarrGroup],
  );
  const author = useMemo(
    () => zarrGroup.attrs["author"] as TextConfig,
    [zarrGroup],
  );

  // Default font sizes
  const titleFontSize = title?.font_size || 80;
  const subtitleFontSize = subtitle?.font_size || 40;
  const authorFontSize = author?.font_size || 30;

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        padding: "40px",
        boxSizing: "border-box",
      }}
    >
      {/* Title */}
      {title && (
        <div
          style={{
            fontSize: `${titleFontSize}px`,
            fontFamily: title.font_family || undefined,
            color: title.color || undefined,
            marginBottom: "20px",
          }}
        >
          {title.text}
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            fontSize: `${subtitleFontSize}px`,
            fontFamily: subtitle.font_family || undefined,
            color: subtitle.color || undefined,
            marginBottom: "20px",
          }}
        >
          {subtitle.text}
        </div>
      )}

      {/* Author */}
      {author && (
        <div
          style={{
            fontSize: `${authorFontSize}px`,
            fontFamily: author.font_family || undefined,
            color: author.color || undefined,
          }}
        >
          {author.text}
        </div>
      )}
    </div>
  );
};

export default FPTitleSlideContent;
