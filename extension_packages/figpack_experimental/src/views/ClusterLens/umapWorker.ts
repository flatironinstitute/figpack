import { UMAP } from "umap-js";

export type UMAPWorkerInput = {
  data: number[][];
  nNeighbors: number;
  minDist: number;
  spread: number;
};

export type UMAPWorkerMessage =
  | {
      type: "progress";
      epoch: number;
      totalEpochs: number;
      embedding: number[][];
    }
  | { type: "complete"; embedding: number[][] }
  | { type: "error"; error: string };

self.onmessage = (e: MessageEvent<UMAPWorkerInput>) => {
  const { data, nNeighbors, minDist, spread } = e.data;

  try {
    console.log("Worker: Starting UMAP computation...");

    const umap = new UMAP({
      nComponents: 2,
      nNeighbors: Math.min(nNeighbors, data.length - 1),
      minDist,
      spread,
    });

    // Initialize the fitting process
    const nEpochs = umap.initializeFit(data);
    console.log(`Worker: UMAP will run for ${nEpochs} epochs`);

    const updateInterval = 500; // ms
    let lastUpdateTime = Date.now();

    // Step through epochs
    for (let i = 0; i < nEpochs; i++) {
      umap.step();

      const currentTime = Date.now();

      // Send progress updates at specified interval
      if (currentTime - lastUpdateTime >= updateInterval || i === nEpochs - 1) {
        const currentEmbedding = umap.getEmbedding().map((pt) => pt.slice());

        const message: UMAPWorkerMessage = {
          type: "progress",
          epoch: i + 1,
          totalEpochs: nEpochs,
          embedding: currentEmbedding,
        };

        self.postMessage(message);
        lastUpdateTime = currentTime;
      }
    }

    // Send final result
    const finalEmbedding = umap.getEmbedding().map((pt) => pt.slice());
    const completeMessage: UMAPWorkerMessage = {
      type: "complete",
      embedding: finalEmbedding,
    };

    console.log("Worker: UMAP computation completed");
    self.postMessage(completeMessage);
  } catch (error) {
    const errorMessage: UMAPWorkerMessage = {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    self.postMessage(errorMessage);
  }
};
