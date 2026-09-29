'use client';

import React, { useEffect, useRef } from 'react';

interface KraepelinKeypadProps {
  onInput: (digit: number) => void;
  disabled?: boolean;
}

export function KraepelinKeypad({ onInput, disabled = false }: KraepelinKeypadProps) {
  const onInputRef = useRef(onInput);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    onInputRef.current = onInput;
    disabledRef.current = disabled;
  }, [onInput, disabled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (disabledRef.current) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        onInputRef.current(parseInt(e.key, 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="grid grid-cols-3 gap-3 justify-items-center max-w-[240px] sm:max-w-[280px] mx-auto select-none">
      {digits.map((digit) => (
        <button
          key={digit}
          type="button"
          disabled={disabled}
          onClick={() => onInput(digit)}
          className="clay-button bg-[#f0ecf4] text-slate-800 text-xl font-bold w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onInput(0)}
        className="col-start-2 clay-button bg-[#f0ecf4] text-slate-800 text-xl font-bold w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        0
      </button>
    </div>
  );
}
