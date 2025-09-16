/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FigureAnnotationsAction,
  FigureAnnotationsState,
  FPViewContext,
} from "./figpack-interface";

export const initialFigureAnnotationsState: FigureAnnotationsState = {
  editingAnnotations: false,
  containsViewWithAnnotations: false,
  annotations: {},
};

export const figureAnnotationsReducer = (
  state: FigureAnnotationsState,
  action: FigureAnnotationsAction,
): FigureAnnotationsState => {
  switch (action.type) {
    case "setAnnotation": {
      if (!state.editingAnnotations) {
        console.warn("Attempt to set annotation while not in editing mode");
        return state;
      }
      const { path, key, value } = action;
      return {
        ...state,
        annotations: {
          ...state.annotations,
          [path]: {
            ...state.annotations[path],
            [key]: value,
          },
        },
      };
    }
    case "removeAnnotation": {
      if (!state.editingAnnotations) {
        console.warn("Attempt to remove annotation while not in editing mode");
        return state;
      }
      const { path, key } = action;
      if (!state.annotations[path] || !(key in state.annotations[path])) {
        return state; // No change needed
      }
      const newAnnotationsForPath: { [key: string]: string } = {
        ...state.annotations[path],
      };
      delete newAnnotationsForPath[key];
      const newAnnotations = { ...state.annotations };
      if (Object.keys(newAnnotationsForPath).length === 0) {
        delete newAnnotations[path];
      } else {
        newAnnotations[path] = newAnnotationsForPath;
      }
      return {
        ...state,
        annotations: newAnnotations,
      };
    }
    case "clearAnnotations": {
      if (!state.editingAnnotations) {
        console.warn("Attempt to clear annotations while not in editing mode");
        return state;
      }
      const { path } = action;
      if (!state.annotations[path]) {
        return state; // No change needed
      }
      const newAnnotations = { ...state.annotations };
      delete newAnnotations[path];
      return {
        ...state,
        annotations: newAnnotations,
      };
    }
    case "setAllAnnotations": {
      return {
        ...state,
        annotations: action.annotations,
      };
    }
    case "setEditingAnnotations": {
      return {
        ...state,
        editingAnnotations: action.editing,
      };
    }
    case "reportViewWithAnnotations": {
      return {
        ...state,
        containsViewWithAnnotations: true,
      };
    }
    default:
      return state;
  }
};

export const createFigureAnnotationsContext = (): FPViewContext => {
  const stateRef: { current: FigureAnnotationsState } = {
    current: initialFigureAnnotationsState,
  };
  const listeners: ((newValue: FigureAnnotationsState) => void)[] = [];

  const dispatch = (action: any) => {
    stateRef.current = figureAnnotationsReducer(stateRef.current, action);
    listeners.forEach((callback) => {
      callback(stateRef.current);
    });
  };

  const onChange = (callback: (newValue: FigureAnnotationsState) => void) => {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  };

  return {
    stateRef,
    dispatch,
    onChange,
    createNew: createFigureAnnotationsContext,
  };
};
