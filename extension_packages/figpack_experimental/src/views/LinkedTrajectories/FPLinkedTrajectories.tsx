import React, { useEffect, useState } from "react";
import { ZarrGroup } from "../../figpack-interface";
import LinkedTrajectoriesView, {
  LinkedTrajectoriesData,
  PanelData,
} from "./LinkedTrajectoriesView";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

type PanelMeta = {
  dataset: string;
  title: string;
  x_label: string;
  y_label: string;
  equal_aspect: boolean;
};

const FPLinkedTrajectories: React.FC<Props> = ({
  zarrGroup,
  width,
  height,
}) => {
  const [data, setData] = useState<LinkedTrajectoriesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        const a = zarrGroup.attrs;
        const numItems: number = a["num_items"];
        const numTimes: number = a["num_times"];
        const timesRaw = await zarrGroup.getDatasetData("times", {});
        if (!timesRaw) throw new Error("Missing dataset: times");
        const panelsMeta: PanelMeta[] = a["panels"];
        const panels: PanelData[] = [];
        for (const pm of panelsMeta) {
          const d = await zarrGroup.getDatasetData(pm.dataset, {});
          if (!d) throw new Error(`Missing dataset: ${pm.dataset}`);
          panels.push({
            title: pm.title,
            xLabel: pm.x_label,
            yLabel: pm.y_label,
            equalAspect: pm.equal_aspect,
            coords: d instanceof Float32Array ? d : Float32Array.from(d),
          });
        }
        if (canceled) return;
        setData({
          numItems,
          numTimes,
          times: Array.from(timesRaw as Float64Array),
          panels,
          itemLabels: a["item_labels"],
          itemColors: a["item_colors"],
          timeLabel: a["time_label"] || "",
          tailLength: a["tail_length"] || 0,
          showGhost: a["show_ghost"] !== false,
          initialTime: a["initial_time"],
          highlightInterval: a["highlight_interval"],
          numColumns: a["num_columns"] || panels.length,
        });
      } catch (err) {
        if (!canceled)
          setError(err instanceof Error ? err.message : String(err));
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);

  if (error)
    return <div style={{ padding: 20, color: "red" }}>Error: {error}</div>;
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;
  return <LinkedTrajectoriesView data={data} width={width} height={height} />;
};

export default FPLinkedTrajectories;
