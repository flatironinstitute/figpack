/* eslint-disable @typescript-eslint/no-explicit-any */
export type FigureAnnotation = {
  // uniquely identified by path + name
  path: string;
  name: string;
  timestamp: number;
  data: any;
};
