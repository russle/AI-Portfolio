import React, { useState, useCallback } from 'react';
import type { WithdrawalHeatmap, HeatmapCell } from '../utils/retirement';

interface Props {
  data: WithdrawalHeatmap;
  currentReturnRate: number;
}

interface TooltipState {
  cell: HeatmapCell;
  x: number;
  y: number;
}

export const WithdrawalHeatmap: React.FC<Props> = ({ data, currentReturnRate }) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // 找到最接近當前設定報酬率的 row index (容差 0.5%，grid 間距 1%)
  const currentRowIdx = data.rows.findIndex((r) => Math.abs(r - currentReturnRate) < 0.005);

  const formatAsset = (val: number): string => {
    if (val >= 100_000_000) return `$${(val / 100_000_000).toFixed(2)}億`;
    if (val >= 10_000) return `$${(val / 10_000).toFixed(0)}萬`;
    return `$${val.toLocaleString()}`;
  };

  const handleMouseEnter = useCallback((cell: HeatmapCell, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ cell, x: rect.left + rect.width / 2, y: rect.top - 8 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const getStatusLabel = (status: HeatmapCell['status']): string => {
    switch (status) {
      case 'safe': return '安全 (剩餘 >50%)';
      case 'warning': return '警戒 (剩餘 0%~50%)';
      case 'depleted': return '耗盡 (歸零)';
    }
  };

  // Grid 欄位配置: 第一欄為報酬率標籤 (60px)，其餘為每年一格
  const gridCols = `60px repeat(${data.cols.length}, minmax(22px, 1fr))`;
  const minGridWidth = data.cols.length * 26 + 100;

  return (
    <div className="relative select-none">
      {/* 熱圖本體 — 可橫向捲動 */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: gridCols,
            minWidth: `${minGridWidth}px`,
          }}
        >
          {/* ── 左上角空角落 ── */}
          <div className="h-6" />

          {/* ── X 軸標籤：退休年數（每 5 年顯示一次） ── */}
          {data.cols.map((col) => (
            <div
              key={`hdr-${col}`}
              className="text-[10px] text-slate-400 font-semibold text-center flex items-end justify-center pb-0.5 leading-none"
            >
              {col % 5 === 0 ? `${col}年` : ''}
            </div>
          ))}

          {/* ── 每一列 = 一個報酬率假設 ── */}
          {data.rows.map((rate, rowIdx) => (
            <React.Fragment key={`row-${rate}`}>
              {/* Y 軸標籤 */}
              <div
                className={`text-[10px] font-bold text-right pr-2 flex items-center justify-end h-6 leading-none ${
                  rowIdx === currentRowIdx ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                {(rate * 100).toFixed(0)}%
              </div>

              {/* 每個年份的 cell */}
              {data.data[rowIdx].map((cell, colIdx) => {
                let bgClass = '';
                if (cell.status === 'safe') bgClass = 'bg-emerald-400 hover:bg-emerald-500';
                else if (cell.status === 'warning') bgClass = 'bg-amber-400 hover:bg-amber-500';
                else bgClass = 'bg-rose-400 hover:bg-rose-500';

                const isCurrent = rowIdx === currentRowIdx;

                return (
                  <div
                    key={`cell-${rowIdx}-${colIdx}`}
                    className={`rounded-sm ${bgClass} transition-colors duration-100 cursor-default h-6 ${
                      isCurrent ? 'ring-[1.5px] ring-blue-500 ring-inset' : ''
                    }`}
                    onMouseEnter={(e) => handleMouseEnter(cell, e)}
                    onMouseLeave={handleMouseLeave}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── 浮動提示 (Tooltip) ── */}
      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-bold mb-0.5">
            報酬率 {(tooltip.cell.returnRate * 100).toFixed(0)}%
            {' · '}第 {tooltip.cell.yearsAfterRetire} 年
          </div>
          <div className="text-slate-200">
            剩餘資產: {formatAsset(tooltip.cell.assetRemaining)}
          </div>
          <div
            className={`mt-0.5 font-semibold ${
              tooltip.cell.status === 'safe'
                ? 'text-emerald-300'
                : tooltip.cell.status === 'warning'
                  ? 'text-amber-300'
                  : 'text-rose-300'
            }`}
          >
            {getStatusLabel(tooltip.cell.status)}
          </div>
        </div>
      )}

      {/* ── 圖例 ── */}
      <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">🟢</span>
          <span>安全 (&gt;50% 資產餘存)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">🟡</span>
          <span>警戒 (0%~50% 資產餘存)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">🔴</span>
          <span>耗盡 (已歸零)</span>
        </div>
      </div>
    </div>
  );
};
