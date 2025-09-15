import { FunctionComponent } from "react";

type Props = {
  revertFigureAnnotations: () => void;
  figureAnnotationsIsDirty: boolean;
  saveFigureAnnotations?: () => void;
  curating?: boolean;
  setCurating?: React.Dispatch<React.SetStateAction<boolean>>;
};

const FigureAnnotationsStatusComponent: FunctionComponent<Props> = ({
  figureAnnotationsIsDirty,
  revertFigureAnnotations,
  saveFigureAnnotations,
  curating,
  setCurating,
}) => {
  if (!curating && setCurating) {
    return (
      <div className="figure-annotations-status">
        <button className="curate-button" onClick={() => setCurating(true)}>
          Curate Figure
        </button>
      </div>
    );
  } else {
    if (figureAnnotationsIsDirty) {
      return (
        <div className="figure-annotations-status">
          {saveFigureAnnotations && (
            <button className="save-button" onClick={saveFigureAnnotations}>
              Save Annotations
            </button>
          )}
          <button className="revert-button" onClick={revertFigureAnnotations}>
            Revert Annotation Changes
          </button>
        </div>
      );
    } else {
      return <></>;
    }
  }
};

export default FigureAnnotationsStatusComponent;
