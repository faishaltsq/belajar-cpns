'use client';

import React from 'react';
import { KraepelinColumnResult } from '@/lib/types';

interface KraepelinChartProps {
  columnResults: KraepelinColumnResult[];
}

export function KraepelinChart({ columnResults }: KraepelinChartProps) {
  if (columnResults.length === 0) return null;

  const counts = columnResults.map((c) => c.totalAttempts);
  const maxCount = Math.max(...counts, 1);

  // Chart dimensions
  const padding = { top: 30, right: 20, bottom: 50, left: 50 };
  const chartW = Math.max(300, columnResults.length * 50);
  const chartH = 200;
  const totalW = chartW + padding.left + padding.right;
  const totalH = chartH + padding.top + padding.bottom;

  const xStep = chartW / Math.max(columnResults.length - 1, 1);
  const yScale = (v: number) => chartH - (v / maxCount) * chartH;

  // Polyline points
  const points = counts.map(
    (c, i) => `${padding.left + i * xStep},${padding.top + yScale(c)}`
  );
  const polyline = points.join(' ');

  // Gradient fill path
  const areaPath = [
    `M ${padding.left},${padding.top + chartH}`,
    ...counts.map(
      (c, i) => `L ${padding.left + i * xStep},${padding.top + yScale(c)}`
    ),
    `L ${padding.left + (counts.length - 1) * xStep},${padding.top + chartH}`,
    'Z',
  ].join(' ');

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((maxCount / yTicks) * i)
  );

  return (
    <div className="clay-card-flat rounded-3xl p-4 overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="w-full min-w-[300px]"
        role="img"
        aria-label="Kraepelin result chart"
      >
        <defs>
          <linearGradient id="kraep-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTickValues.map((v) => (
          <line
            key={`grid-${v}`}
            x1={padding.left}
            y1={padding.top + yScale(v)}
            x2={padding.left + chartW}
            y2={padding.top + yScale(v)}
            stroke="#e2e0e8"
            strokeDasharray="4"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#kraep-fill)" />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {columnResults.map((col, i) => {
          const cx = padding.left + i * xStep;
          const cy = padding.top + yScale(col.totalAttempts);
          const hasError = col.wrongCount > 0;

          return (
            <React.Fragment key={col.columnIndex}>
              <circle cx={cx} cy={cy} r="4" fill={hasError ? '#ef4444' : '#8b5cf6'} />
              {hasError && (
                <circle cx={cx} cy={cy} r="7" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.5" />
              )}
            </React.Fragment>
          );
        })}

        {/* X-axis labels */}
        {columnResults.map((col, i) => (
          <text
            key={`x-${col.columnIndex}`}
            x={padding.left + i * xStep}
            y={padding.top + chartH + 20}
            textAnchor="middle"
            fontSize="10"
            fill="#64748b"
          >
            K{col.columnIndex + 1}
          </text>
        ))}

        {/* Y-axis labels */}
        {yTickValues.map((v) => (
          <text
            key={`y-${v}`}
            x={padding.left - 8}
            y={padding.top + yScale(v) + 4}
            textAnchor="end"
            fontSize="10"
            fill="#64748b"
          >
            {v}
          </text>
        ))}

        {/* Axis labels */}
        <text
          x={padding.left + chartW / 2}
          y={padding.top + chartH + 40}
          textAnchor="middle"
          fontSize="11"
          fill="#475569"
          fontWeight="600"
        >
          Kolom
        </text>
        <text
          x={12}
          y={padding.top + chartH / 2}
          textAnchor="middle"
          fontSize="11"
          fill="#475569"
          fontWeight="600"
          transform={`rotate(-90, 12, ${padding.top + chartH / 2})`}
        >
          Jawaban
        </text>

        {/* Legend */}
        <line x1={padding.left} y1={totalH - 8} x2={padding.left + 18} y2={totalH - 8} stroke="#8b5cf6" strokeWidth="2.5" />
        <text x={padding.left + 22} y={totalH - 4} fontSize="10" fill="#64748b">
          Kecepatan Kerja
        </text>
        <circle cx={padding.left + 120} cy={totalH - 8} r="4" fill="#ef4444" />
        <text x={padding.left + 128} y={totalH - 4} fontSize="10" fill="#64748b">
          Kesalahan
        </text>
      </svg>
    </div>
  );
}
