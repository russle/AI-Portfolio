import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import type { TooltipValueType, TooltipPayloadEntry } from 'recharts';

interface ChartLineConfig {
  key: string;
  name: string;
  stroke: string;
  fill?: string;
}

interface LineChartProps {
  data: Record<string, number | string>[];
  xKey: string;
  lines: ChartLineConfig[];
  height?: number;
  formatYAxis?: (val: number) => string;
}

// 預設貨幣格式化 (萬)
const defaultFormatY = (val: number) => {
  if (val >= 10000) {
    return `$${Math.round(val / 10000)}萬`;
  }
  return `$${val}`;
};

export const LineChart: React.FC<LineChartProps> = ({
  data,
  xKey,
  lines,
  height = 300,
  formatYAxis = defaultFormatY
}) => {
  return (
    <div style={{ width: '100%', height }} className="select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <defs>
            {/* 為每條線產生專屬的磨砂漸層填充 */}
            {lines.map((line) => (
              <linearGradient key={`grad-${line.key}`} id={`grad-${line.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={line.stroke} stopOpacity={0.2} />
                <stop offset="95%" stopColor={line.stroke} stopOpacity={0.0} />
              </linearGradient>
            ))}
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
          
          <XAxis 
            dataKey={xKey} 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
            dy={8}
          />
          
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
            tickFormatter={formatYAxis}
            dx={-8}
          />
          
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.9)', 
              borderRadius: '16px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              boxShadow: '0 10px 15px -3px rgba(148, 163, 184, 0.1)',
              backdropFilter: 'blur(8px)',
              padding: '12px'
            }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}
            formatter={(value) => value !== undefined ? [`$${Number(value).toLocaleString()} 元`] : ['']}
            itemSorter={(item: TooltipPayloadEntry) => {
              const index = lines.findIndex(l => l.key === item.dataKey);
              return index !== -1 ? index : 999;
            }}
          />
          
          {lines.length > 1 && (
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}
            />
          )}
          
          {lines.map((line) => (
            <Area
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.stroke}
              strokeWidth={3}
              fill={line.fill || `url(#grad-${line.key})`}
              activeDot={{ r: 6, strokeWidth: 0, fill: line.stroke }}
              dot={false}
              animationDuration={800}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
