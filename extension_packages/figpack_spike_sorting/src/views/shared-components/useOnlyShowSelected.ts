import { useMemo, useState } from "react";

export const useOnlyShowSelected = () => {
  const [onlyShowSelected, setOnlyShowSelected] = useState(false);

  const customToolbarActions = useMemo(() => {
    return [
      {
        id: "only-show-selected",
        label: "Only Show Selected",
        tooltip: "Toggle visibility of only selected units",
        icon: onlyShowSelected ? "👁️" : "👁️‍🗨️",
        isActive: onlyShowSelected,
        onClick: () => setOnlyShowSelected((v) => !v),
      },
    ];
  }, [onlyShowSelected]);

  return {
    onlyShowSelected,
    customToolbarActions,
  };
};
