import {
  FunctionComponent,
  PropsWithChildren,
  useMemo,
  useReducer,
  useState,
} from "react";
import SortingCurationContext, {
  sortingCurationReducer,
} from "./SortingCurationContext";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Props = {};

const SetupSortingCuration: FunctionComponent<PropsWithChildren<Props>> = ({
  children,
}) => {
  const [sortingCuration, sortingCurationDispatch] = useReducer(
    sortingCurationReducer,
    {},
  );
  const [labelChoices, setLabelChoices] = useState<string[]>();
  const value = useMemo(
    () => ({
      sortingCuration,
      sortingCurationDispatch,
      labelChoices,
      setLabelChoices,
    }),
    [sortingCuration, sortingCurationDispatch, labelChoices],
  );

  // const { selectedUnitIds } = useSelectedUnitIds();

  return (
    <SortingCurationContext.Provider value={value}>
      <div tabIndex={0}>{children}</div>
    </SortingCurationContext.Provider>
  );
};

export default SetupSortingCuration;
