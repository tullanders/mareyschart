import { TrainLine } from './TrainLine';
import type { Train } from './types';

export function TrainLayer({ trains }: { trains: Train[] }) {
  return (
    <g data-testid="train-layer">
      {trains.map((train) => (
        <TrainLine key={train.id} train={train} />
      ))}
    </g>
  );
}
