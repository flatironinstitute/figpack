import React, { useEffect, useState } from "react";
import { ZarrGroup } from "../../figpack-interface";
import LinkedCurvesView, {
  CurvePanelData,
  LinkedCurvesData,
} from "./LinkedCurvesView";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

type PanelMeta = {
  prefix: string;
  title: string;
  x_label: string;
  y_label: string;
  x_scale: "linear" | "symlog";
  symlog_constant: number;
  x_range?: [number, number];
  y_range?: [number, number];
  x_ticks?: number[];
  x_tick_labels?: string[];
  series_names: string[];
  legend_position?: CurvePanelData["legendPosition"];
};

const toFloat32 = (d: ArrayLike<number>) =>
  d instanceof Float32Array ? d : Float32Array.from(d);
const toInt32 = (d: ArrayLike<number>) =>
  d instanceof Int32Array ? d : Int32Array.from(d);

const FPLinkedCurves: React.FC<Props> = ({ zarrGroup, width, height }) => {
  const [data, setData] = useState<LinkedCurvesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        const a = zarrGroup.attrs;
        const panels: CurvePanelData[] = [];
        for (const pm of a["panels"] as PanelMeta[]) {
          const get = async (name: string) => {
            const d = await zarrGroup.getDatasetData(
              `${pm.prefix}_${name}`,
              {},
            );
            if (!d) throw new Error(`Missing dataset: ${pm.prefix}_${name}`);
            return d;
          };
          panels.push({
            title: pm.title,
            xLabel: pm.x_label,
            yLabel: pm.y_label,
            xScale: pm.x_scale,
            symlogConstant: pm.symlog_constant,
            xRange: pm.x_range,
            yRange: pm.y_range,
            xTicks: pm.x_ticks,
            xTickLabels: pm.x_tick_labels,
            seriesNames: pm.series_names,
            legendPosition: pm.legend_position || "upper left",
            xy: toFloat32(await get("xy")),
            offsets: toInt32(await get("offsets")),
            info: toInt32(await get("info")),
            markerSizes: toFloat32(await get("marker_sizes")),
          });
        }
        if (canceled) return;
        setData({
          itemLabels: a["item_labels"],
          itemColors: a["item_colors"],
          itemGroups: a["item_groups"],
          groups: a["groups"],
          groupColors: a["group_colors"],
          numColumns: a["num_columns"] || panels.length,
          panels,
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
  return <LinkedCurvesView data={data} width={width} height={height} />;
};

export default FPLinkedCurves;
