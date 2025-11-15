import { useEffect, useState } from "react";
import { ZarrGroup } from "../figpack-interface";
import { PoseEstimationData } from "./types";

export const usePoseEstimationClient = (
  zarrGroup: ZarrGroup,
): PoseEstimationData | undefined => {
  const [data, setData] = useState<PoseEstimationData | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        // Load metadata from attributes
        const attrs = zarrGroup.attrs;
        const numTimepoints = attrs.num_timepoints as number;
        const numNodes = attrs.num_nodes as number;
        const xMin = attrs.x_min as number;
        const xMax = attrs.x_max as number;
        const yMin = attrs.y_min as number;
        const yMax = attrs.y_max as number;
        const description = (attrs.description as string) || "";

        const startTime = attrs.start_time as number;
        const rate = attrs.rate as number;

        if (cancelled) return;

        // Load pose data (3D array: Time x Nodes x 2)
        const poseData = await zarrGroup.getDatasetData("pose_data", {});
        if (cancelled) return;
        if (!poseData) {
          throw new Error("Failed to load pose data");
        }

        // Load node names and descriptions from attributes
        const nodeNames = (attrs.node_names as string[]) || [];
        const nodeDescriptions = (attrs.node_descriptions as string[]) || [];

        if (nodeNames.length !== numNodes) {
          throw new Error(
            `Expected ${numNodes} node names, got ${nodeNames.length}`,
          );
        }

        if (cancelled) return;

        setData({
          startTime,
          rate,
          poseData: poseData as Float32Array | Float64Array,
          nodeNames,
          nodeDescriptions,
          numTimepoints,
          numNodes,
          xMin,
          xMax,
          yMin,
          yMax,
          description,
        });
      } catch (error) {
        console.error("Error loading pose estimation data:", error);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [zarrGroup]);

  return data;
};
