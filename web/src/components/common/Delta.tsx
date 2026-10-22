import React from 'react';

interface DeltaProps {
  value: number;
  percent?: number;
  showIcon?: boolean;
  className?: string;
  isCurrency?: boolean;
}

export const Delta: React.FC<DeltaProps> = ({
  value,
  percent,
  showIcon = true,
  className = '',
  isCurrency = false
}) => {
  const isPositive = value >= 0;
  const isZero = value === 0;

  const colorClass = isZero
    ? 'text-gray-400'
    : isPositive
    ? 'text-emerald-400'
    : 'text-rose-400';

  const sign = isPositive && !isZero ? '+' : '';

  return (
    <span className={`inline-flex items-center gap-1 font-mono font-medium ${colorClass} ${className}`}>
      {showIcon && !isZero && (
        <span className="text-[10px] leading-none">
          {isPositive ? '▲' : '▼'}
        </span>
      )}
      <span>
        {sign}{isCurrency ? `₹${Math.abs(value).toFixed(2)}` : value.toFixed(2)}
      </span>
      {percent !== undefined && (
        <span className="text-xs opacity-85">
          ({sign}{percent.toFixed(2)}%)
        </span>
      )}
    </span>
  );
};
