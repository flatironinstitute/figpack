import { FunctionComponent, useEffect, useState } from "react";
import { ZarrGroup } from "../plugin-interface/ZarrTypes";
import UnitsTableView from "./view-units-table/UnitsTableView";
import { UnitsTableViewData } from "./view-units-table/UnitsTableViewData";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

export const FPUnitsTable: FunctionComponent<Props> = ({
  zarrGroup,
  width,
  height,
}) => {
  const [data, setData] = useState<UnitsTableViewData | null>(null);

  useEffect(() => {
    let canceled = false;
    const loadData = async () => {
      // Get columns from attributes
      const columns = zarrGroup.attrs["columns"] || [];

      // Get rows from attributes
      const rows = zarrGroup.attrs["rows"] || [];

      // Get similarity scores from attributes (optional)
      const similarityScores = zarrGroup.attrs["similarityScores"] || undefined;

      if (canceled) return;

      setData({
        type: "UnitsTable" as const,
        columns,
        rows,
        similarityScores,
      });
    };

    loadData();
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);

  if (!data) {
    return <div>Loading...</div>;
  }

  return <UnitsTableView data={data} width={width} height={height} />;
};
