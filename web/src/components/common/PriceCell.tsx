import React, { useState, useEffect, useRef } from 'react';

interface PriceCellProps {
  price: number;
  currency?: string;
  className?: string;
}

export const PriceCell: React.FC<PriceCellProps> = ({
  price,
  currency = '₹',
  className = ''
}) => {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number>(price);

  useEffect(() => {
    if (prevPriceRef.current !== price) {
      if (price > prevPriceRef.current) {
        setFlash('up');
      } else if (price < prevPriceRef.current) {
        setFlash('down');
      }
      prevPriceRef.current = price;

      const timer = setTimeout(() => {
        setFlash(null);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [price]);

  const flashClass = flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : '';

  return (
    <span
      className={`inline-block font-mono font-semibold tabular-nums px-1.5 py-0.5 rounded transition-colors duration-300 ${flashClass} ${className}`}
    >
      {currency ? `${currency}` : ''}{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
};
