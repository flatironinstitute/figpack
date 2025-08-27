/**
 * Utility functions for MultiChannelTimeseries components
 */

export const join = (p1: string, p2: string): string => {
  if (p1.endsWith("/")) {
    return p1 + p2;
  } else {
    return p1 + "/" + p2;
  }
};
