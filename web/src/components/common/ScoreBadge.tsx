import React from 'react';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, size = 'md' }) => {
  let color = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40 ring-emerald-500/20';
  if (score < 60) {
    color = 'text-rose-400 bg-rose-500/10 border-rose-500/40 ring-rose-500/20';
  } else if (score < 80) {
    color = 'text-amber-400 bg-amber-500/10 border-amber-500/40 ring-amber-500/20';
  } else if (score < 90) {
    color = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/40 ring-cyan-500/20';
  }

  const sizeClasses = size === 'sm'
    ? 'text-xs px-1.5 py-0.5'
    : size === 'lg'
    ? 'text-base px-3 py-1 font-bold'
    : 'text-sm px-2 py-0.5 font-semibold';

  return (
    <span className={`inline-flex items-center gap-1 font-mono rounded border ring-1 ${color} ${sizeClasses}`}>
      <span className="text-[10px] text-gray-400 font-sans">SCORE</span>
      <span>{score}</span>
    </span>
  );
};
