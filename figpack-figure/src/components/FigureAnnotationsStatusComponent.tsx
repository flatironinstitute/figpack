import { FunctionComponent } from "react";

type Props = {
  revertFigureAnnotations: () => void;
  figureAnnotationsIsDirty: boolean;
  saveFigureAnnotations: () => void;
};

const FigureAnnotationsStatusComponent: FunctionComponent<Props> = ({
  figureAnnotationsIsDirty,
  revertFigureAnnotations,
  saveFigureAnnotations,
}) => {
  if (figureAnnotationsIsDirty) {
    return (
      <div className="figure-annotations-status">
        <button className="save-button" onClick={saveFigureAnnotations}>
          Save Annotations
        </button>
        <button className="revert-button" onClick={revertFigureAnnotations}>
          Revert Annotation Changes
        </button>
      </div>
    );
  } else {
    return <></>;
  }
};

export default FigureAnnotationsStatusComponent;
