// SVG export utilities for converting Canvas2D operations to SVG

export interface SVGContext {
  // Canvas2D-like interface for SVG generation
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  canvas: { width: number; height: number };

  // Drawing methods
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
  ): void;
  rect(x: number, y: number, width: number, height: number): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
  ): void;
  stroke(): void;
  fill(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  setLineDash(segments: number[]): void;
  getLineDash(): number[];
  save(): void;
  restore(): void;
  clip(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;

  // SVG-specific methods
  getSVG(): string;
}

class SVGContextImpl implements SVGContext {
  private svgElements: string[] = [];
  private currentPath: string[] = [];
  private stateStack: Array<{
    strokeStyle: string | CanvasGradient | CanvasPattern;
    fillStyle: string | CanvasGradient | CanvasPattern;
    lineWidth: number;
    globalAlpha: number;
    font: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
    lineDash: number[];
    transform: { translateX: number; translateY: number; rotation: number };
  }> = [];
  private lineDash: number[] = [];
  private clipPath: string | null = null;
  private transform = { translateX: 0, translateY: 0, rotation: 0 };

  public strokeStyle: string | CanvasGradient | CanvasPattern = "black";
  public fillStyle: string | CanvasGradient | CanvasPattern = "black";
  public lineWidth: number = 1;
  public globalAlpha: number = 1;
  public font: string = "10px sans-serif";
  public textAlign: CanvasTextAlign = "start";
  public textBaseline: CanvasTextBaseline = "alphabetic";
  public canvas: { width: number; height: number };

  constructor(width: number, height: number) {
    this.canvas = { width, height };
  }

  private colorToString(
    color: string | CanvasGradient | CanvasPattern,
  ): string {
    if (typeof color === "string") {
      return color;
    }
    return "black"; // Fallback for gradients/patterns
  }

  private getOpacityAttr(): string {
    return this.globalAlpha !== 1 ? ` opacity="${this.globalAlpha}"` : "";
  }

  private getClipPathAttr(): string {
    return this.clipPath ? ` clip-path="url(#clipPath)"` : "";
  }

  beginPath(): void {
    this.currentPath = [];
  }

  moveTo(x: number, y: number): void {
    this.currentPath.push(`M ${x} ${y}`);
  }

  lineTo(x: number, y: number): void {
    this.currentPath.push(`L ${x} ${y}`);
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
  ): void {
    // Convert arc to SVG path
    const startX = x + radius * Math.cos(startAngle);
    const startY = y + radius * Math.sin(startAngle);
    const endX = x + radius * Math.cos(endAngle);
    const endY = y + radius * Math.sin(endAngle);

    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

    if (startAngle === 0 && endAngle === Math.PI * 2) {
      // Full circle
      this.currentPath.push(`M ${x - radius} ${y}`);
      this.currentPath.push(`A ${radius} ${radius} 0 1 1 ${x + radius} ${y}`);
      this.currentPath.push(`A ${radius} ${radius} 0 1 1 ${x - radius} ${y}`);
    } else {
      this.currentPath.push(`M ${startX} ${startY}`);
      this.currentPath.push(
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      );
    }
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.currentPath.push(`M ${x} ${y}`);
    this.currentPath.push(`L ${x + width} ${y}`);
    this.currentPath.push(`L ${x + width} ${y + height}`);
    this.currentPath.push(`L ${x} ${y + height}`);
    this.currentPath.push(`Z`);
  }

  ellipse(
    x: number,
    y: number,
    radiusX: number,
    _radiusY: number,
    _rotation: number,
    startAngle: number,
    endAngle: number,
  ): void {
    // Simplified ellipse implementation - treat as circle for now
    this.arc(x, y, radiusX, startAngle, endAngle);
  }

  stroke(): void {
    if (this.currentPath.length === 0) return;

    const pathData = this.currentPath.join(" ");
    const strokeDashArray =
      this.lineDash.length > 0
        ? ` stroke-dasharray="${this.lineDash.join(",")}"`
        : "";

    this.svgElements.push(
      `<path d="${pathData}" fill="none" stroke="${this.colorToString(this.strokeStyle)}" stroke-width="${this.lineWidth}"${strokeDashArray}${this.getOpacityAttr()}${this.getClipPathAttr()} />`,
    );
  }

  fill(): void {
    if (this.currentPath.length === 0) return;

    const pathData = this.currentPath.join(" ");

    this.svgElements.push(
      `<path d="${pathData}" fill="${this.colorToString(this.fillStyle)}" stroke="none"${this.getOpacityAttr()}${this.getClipPathAttr()} />`,
    );
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.svgElements.push(
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${this.colorToString(this.fillStyle)}"${this.getOpacityAttr()}${this.getClipPathAttr()} />`,
    );
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.svgElements.push(
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${this.colorToString(this.strokeStyle)}" stroke-width="${this.lineWidth}"${this.getOpacityAttr()}${this.getClipPathAttr()} />`,
    );
  }

  fillText(text: string, x: number, y: number): void {
    // Parse font for SVG attributes
    const fontSize = this.font.match(/(\d+)px/)?.[1] || "10";
    const fontFamily = this.font.includes("Arial")
      ? "Arial"
      : this.font.includes("monospace")
        ? "monospace"
        : this.font.includes("sans-serif")
          ? "sans-serif"
          : "Arial";

    // Handle text alignment
    let textAnchor = "start";
    if (this.textAlign === "center") textAnchor = "middle";
    else if (this.textAlign === "right" || this.textAlign === "end")
      textAnchor = "end";

    // Handle text baseline
    let dominantBaseline = "alphabetic";
    if (this.textBaseline === "top") dominantBaseline = "hanging";
    else if (this.textBaseline === "middle") dominantBaseline = "central";
    else if (this.textBaseline === "bottom") dominantBaseline = "alphabetic";

    // Apply transformations
    const transformX = x + this.transform.translateX;
    const transformY = y + this.transform.translateY;
    const rotationDeg = (this.transform.rotation * 180) / Math.PI;

    const transformAttr =
      this.transform.rotation !== 0 ||
      this.transform.translateX !== 0 ||
      this.transform.translateY !== 0
        ? ` transform="translate(${this.transform.translateX}, ${this.transform.translateY}) rotate(${rotationDeg}, ${x}, ${y})"`
        : "";

    this.svgElements.push(
      `<text x="${transformX}" y="${transformY}" fill="${this.colorToString(this.fillStyle)}" font-size="${fontSize}" font-family="${fontFamily}" text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}"${transformAttr}${this.getOpacityAttr()}${this.getClipPathAttr()}>${text}</text>`,
    );
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    // For SVG, we can add a white rectangle to simulate clearing
    this.svgElements.push(
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white" />`,
    );
  }

  setLineDash(segments: number[]): void {
    this.lineDash = [...segments];
  }

  getLineDash(): number[] {
    return [...this.lineDash];
  }

  save(): void {
    this.stateStack.push({
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
      globalAlpha: this.globalAlpha,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      lineDash: [...this.lineDash],
      transform: { ...this.transform },
    });
  }

  restore(): void {
    const state = this.stateStack.pop();
    if (state) {
      this.strokeStyle = state.strokeStyle;
      this.fillStyle = state.fillStyle;
      this.lineWidth = state.lineWidth;
      this.globalAlpha = state.globalAlpha;
      this.font = state.font;
      this.textAlign = state.textAlign;
      this.textBaseline = state.textBaseline;
      this.lineDash = state.lineDash;
      this.transform = state.transform;
    }
  }

  clip(): void {
    // For simplicity, we'll implement a basic rectangular clip
    if (this.currentPath.length > 0) {
      const pathData = this.currentPath.join(" ");
      this.clipPath = `<defs><clipPath id="clipPath"><path d="${pathData}" /></clipPath></defs>`;
    }
  }

  translate(x: number, y: number): void {
    this.transform.translateX += x;
    this.transform.translateY += y;
  }

  rotate(angle: number): void {
    this.transform.rotation += angle;
  }

  getSVG(): string {
    const defs = this.clipPath || "";
    const elements = this.svgElements.join("\n  ");

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${this.canvas.width}" height="${this.canvas.height}" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  ${elements}
</svg>`;
  }
}

export function createSVGContext(width: number, height: number): SVGContext {
  return new SVGContextImpl(width, height);
}

export function downloadSVG(svgContent: string, filename: string): void {
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
