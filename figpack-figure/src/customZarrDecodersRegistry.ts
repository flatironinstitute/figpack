/* eslint-disable @typescript-eslint/no-explicit-any */
export const customZarrDecoders: {
  [key: string]: (chunk: ArrayBuffer) => Promise<any>;
} = {};

export const registerCustomZarrDecoder = (
  name: string,
  decoder: (chunk: ArrayBuffer) => Promise<any>,
) => {
  if (name in customZarrDecoders) {
    console.warn(
      `Custom Zarr decoder ${name} is already registered. Skipping.`,
    );
    return;
  }
  console.info("Registered custom Zarr decoder:", name);
  customZarrDecoders[name] = decoder;
};
