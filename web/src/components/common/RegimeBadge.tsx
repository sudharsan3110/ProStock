import React from 'react';
import { RegimeType } from '../../types';

interface RegimeBadgeProps {
  regime: RegimeType;
  className?: string;
}

export const RegimeBadge: React.FC<RegimeBadgeProps> = ({ regime, className = '' }) => {
  let label: string = regime;
  let bgClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30';

  switch (regime) {
    case 'TRENDING_BULL':
      label = 'TRENDING BULL';
      bgClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      break;
    case 'TRENDING_BEAR':
      label = 'TRENDING BEAR';
      bgClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      break;
    case 'RANGING':
      label = 'RANGING';
      bgClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      break;
    case 'VOLATILITY_EXPANSION':
      label = 'VOL EXPANSION';
      bgClass = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      break;
    case 'VOLATILITY_COMPRESSION':
      label = 'VOL SQUEEZE';
      bgClass = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      break;
  }

  return (
    <span
      className={`inline-flex items-center text-[11px] font-mono font-semibold px-2 py-0.5 rounded border tracking-wider uppercase ${bgClass} ${className}`}
    >
      {label}
    </span>
  );
};
