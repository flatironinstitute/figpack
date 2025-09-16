export type FigureAnnotationsState = {
  annotations: {
    [path: string]: {
      [key: string]: string;
    };
  };
};

export type FigureAnnotationsAction =
  | { type: "setAnnotation"; path: string; key: string; value: string }
  | { type: "removeAnnotation"; path: string; key: string }
  | { type: "clearAnnotations"; path: string }
  | {
      type: "setAllAnnotations";
      annotations: { [path: string]: { [key: string]: string } };
    };

export const initialFigureAnnotationsState: FigureAnnotationsState = {
  annotations: {},
};

export const figureAnnotationsReducer = (
  state: FigureAnnotationsState,
  action: FigureAnnotationsAction,
): FigureAnnotationsState => {
  switch (action.type) {
    case "setAnnotation": {
      const { path, key, value } = action;
      const newAnnotations = { ...state.annotations };
      if (!newAnnotations[path]) {
        newAnnotations[path] = {};
      }
      newAnnotations[path] = { ...newAnnotations[path], [key]: value };
      return { ...state, annotations: newAnnotations };
    }
    case "removeAnnotation": {
      const { path, key } = action;
      const newAnnotations = { ...state.annotations };
      if (newAnnotations[path]) {
        const a = { ...newAnnotations[path] };
        delete a[key];
        newAnnotations[path] = a;
      }
      return { ...state, annotations: newAnnotations };
    }
    case "clearAnnotations": {
      const { path } = action;
      const newAnnotations = { ...state.annotations };
      delete newAnnotations[path];
      return { ...state, annotations: newAnnotations };
    }
    case "setAllAnnotations": {
      return { ...state, annotations: action.annotations };
    }
    default:
      return state;
  }
};
