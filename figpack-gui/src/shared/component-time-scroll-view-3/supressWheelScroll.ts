const suppressWheelScroll = (
  divRef: React.MutableRefObject<HTMLDivElement | null>
) => {
  if (!divRef || !divRef.current) return;
  const canvases = divRef.current.querySelectorAll("canvas");
  canvases.forEach((c) => {
    c.addEventListener("wheel", (e: Event) => {
      // if ((divRef?.current as any)["_hasFocus"]) {
      e.preventDefault();
      // }
    });
  });
};

export default suppressWheelScroll;