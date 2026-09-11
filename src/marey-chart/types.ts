export type Station = {
  id: string;
  name: string;
  /** Cumulative real-world distance from the first station, in km. */
  distanceKm: number;
};

export type TrainPoint = {
  time: Date;
  place: string;
};

export type Train = {
  id: string;
  points: TrainPoint[];
};

export type MareyChartPanel = {
  id: string;
  stations: Station[];
  trains: Train[];
};

export type MareyChartConfig = {
  xAxis: {
    /** 0 = fully equidistant, 1 = fully proportional to real distance. */
    blendWeight: number;
    minStationPixelGap: number;
    /** Max share (0-1) of the total width a single segment may occupy. */
    maxSegmentShare: number;
  };
  yAxis: {
    defaultPastMs: number;
    defaultFutureMs: number;
    panBackLimitMs: number;
    panForwardLimitMs: number;
    zoomMinDurationMs: number;
    zoomMaxDurationMs: number;
    mechanicalRefreshIntervalMs: number;
    colors: {
      past: string;
      future: string;
      nowLine: string;
    };
  };
};
