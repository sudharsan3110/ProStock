import React from 'react';
import { FreshnessState } from '../../types';

interface FreshnessChipProps {
  state: FreshnessState;
  className?: string;
}

export const FreshnessChip: React.FC<FreshnessChipProps> = ({ state, className = '' }) => {
  let badge = (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-led" />
      LIVE
    </span>
  );

  if (state === 'CLOSED') {
    badge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase bg-gray-700/40 text-gray-400 border border-gray-600/30">
        CLOSED
      </span>
    );
  } else if (state === 'DELAYED' || state === 'STALE') {
    badge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase bg-amber-500/15 text-amber-400 border border-amber-500/40">
        DELAYED
      </span>
    );
  }

  return <span className={className}>{badge}</span>;
};
