import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

const read = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `rgb(${v})` : fallback;
};

/** Chart colours from the design tokens, recomputed when the theme flips. */
export default function useChartTheme() {
  const { theme } = useTheme();
  return useMemo(
    () => ({
      grid: read('--chart-grid', 'rgb(45 59 88)'),
      axis: read('--chart-axis', 'rgb(143 158 188)'),
      text: read('--text-primary', 'rgb(243 246 251)'),
      tooltipBg: read('--chart-tooltip-bg', 'rgb(20 28 46)'),
      border: read('--border-strong', 'rgb(45 59 88)'),
      series: [read('--chart-series-1', 'rgb(212 162 62)'), read('--chart-series-2', 'rgb(96 165 250)'), read('--chart-series-3', 'rgb(45 212 191)')],
      success: read('--status-success', 'rgb(74 222 128)'),
      danger: read('--status-danger', 'rgb(248 113 113)'),
      tooltipStyle: {
        background: read('--chart-tooltip-bg', 'rgb(20 28 46)'),
        border: `1px solid ${read('--border-strong', 'rgb(45 59 88)')}`,
        borderRadius: 10,
        color: read('--text-primary', 'rgb(243 246 251)'),
        fontSize: 12,
        fontFamily: 'Barlow, sans-serif',
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme]
  );
}
