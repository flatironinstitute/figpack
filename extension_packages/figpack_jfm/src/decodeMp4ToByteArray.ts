import * as MP4Box from "mp4box";

/* eslint-disable @typescript-eslint/no-explicit-any */
const decodeMp4ToByteArray = async (
  mp4Data: ArrayBuffer,
): Promise<Uint8Array> => {
  const mp4boxInputFile = MP4Box.createFile();

  const bitmaps: ImageBitmap[] = [];
  let frameCount: number;
  // Decode MP4 frames to bitmaps
  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const decoder = new VideoDecoder({
        async output(inputFrame) {
          const bitmap = await createImageBitmap(inputFrame);
          bitmaps.push(bitmap);
          inputFrame.close();
          if (bitmaps.length === frameCount) {
            resolve({ width: bitmap.width, height: bitmap.height });
          }
        },
        error(error) {
          console.error("VideoDecoder error:", error);
          reject(error);
        },
      });

      mp4boxInputFile.onReady = (info) => {
        const track = info.videoTracks[0];
        if (!track) {
          reject(new Error("No video track found in MP4 data"));
          return;
        }

        let description;
        const trak = mp4boxInputFile.getTrackById(track.id);
        for (const entry of trak.mdia.minf.stbl.stsd.entries) {
          if ((entry as any).avcC || (entry as any).hvcC) {
            const stream = new MP4Box.DataStream();
            if ((entry as any).avcC) {
              (entry as any).avcC.write(stream);
            } else {
              (entry as any).hvcC.write(stream);
            }
            description = new Uint8Array(stream.buffer, 8); // remove the box header
            break;
          }
        }
        if (!description) {
          reject(new Error("No AVC or HEVC description found in MP4 track"));
          return;
        }

        decoder.configure({
          codec: track.codec,
          codedWidth: track.track_width,
          codedHeight: track.track_height,
          description,
        });

        mp4boxInputFile.setExtractionOptions(track.id, null, {
          nbSamples: Infinity,
        });
        mp4boxInputFile.start();
      };

      mp4boxInputFile.onSamples = async (_track_id, _ref, samples) => {
        frameCount = samples.length;
        for (const sample of samples) {
          const data = sample.data;
          if (!data) {
            throw new Error("No sample data");
          }
          decoder.decode(
            new EncodedVideoChunk({
              type: sample.is_sync ? "key" : "delta",
              timestamp: (sample.cts * 1_000_000) / sample.timescale,
              duration: (sample.duration * 1_000_000) / sample.timescale,
              data,
            }),
          );
        }
        await decoder.flush();
      };

      const buffer = mp4Data.slice(0) as any;
      buffer.fileStart = 0;
      mp4boxInputFile.appendBuffer(buffer);
      mp4boxInputFile.flush();
    },
  );

  if (bitmaps.length === 0) return new Uint8Array();

  const { width, height } = dimensions!;

  // Create reusable canvas for extracting pixels
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");

  // Allocate final byte array
  const totalSize = bitmaps.length * height * width * 3;
  const byteArray = new Uint8Array(totalSize);
  const frameSize = height * width * 3;

  // Process each frame directly to byte array
  for (let f = 0; f < bitmaps.length; f++) {
    const frameOffset = f * frameSize;
    const bitmap = bitmaps[f];

    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Write pixels directly to final byte array
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 3;
      for (let x = 0; x < width; x++) {
        const srcOffset = (y * width + x) * 4;
        const dstOffset = frameOffset + rowOffset + x * 3;
        byteArray[dstOffset] = data[srcOffset]; // R
        byteArray[dstOffset + 1] = data[srcOffset + 1]; // G
        byteArray[dstOffset + 2] = data[srcOffset + 2]; // B
      }
    }
  }

  return byteArray;
};

export default decodeMp4ToByteArray;
