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

interface StackedAreaChartProps {
  data: any[];
  xKey: string;
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

// HSL 頂級配色定義 (由底至頂堆疊：美國股票、台灣股票、基金/債券、現金資產、加密貨幣)
const ASSET_CONFIGS = [
  { key: 'us_stock', name: '美國股票', stroke: '#1d4ed8', fillGrad: 'grad-us_stock' },
  { key: 'tw_stock', name: '台灣股票', stroke: '#3b82f6', fillGrad: 'grad-tw_stock' },
  { key: 'fund', name: '基金/債券', stroke: '#64748b', fillGrad: 'grad-fund' },
  { key: 'cash', name: '現金資產', stroke: '#10b981', fillGrad: 'grad-cash' },
  { key: 'crypto', name: '加密貨幣', stroke: '#8b5cf6', fillGrad: 'grad-crypto' },
];

export const StackedAreaChart: React.FC<StackedAreaChartProps> = ({
  data,
  xKey,
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
            {ASSET_CONFIGS.map((config) => (
              <linearGradient key={`grad-${config.key}`} id={config.fillGrad} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.stroke} stopOpacity={0.45} />
                <stop offset="95%" stopColor={config.stroke} stopOpacity={0.05} />
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
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              borderRadius: '20px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              boxShadow: '0 15px 30px -5px rgba(148, 163, 184, 0.12)',
              backdropFilter: 'blur(12px)',
              padding: '16px'
            }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold', padding: '2px 0' }}
            labelStyle={{ fontSize: '11px', fontWeight: 'black', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.05em' }}
            formatter={(value: any, name: any) => [`$${Number(value).toLocaleString()} 元`, name]}
          />
          
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', paddingBottom: '10px' }}
          />
          
          {ASSET_CONFIGS.map((config) => (
            <Area
              key={config.key}
              type="monotone"
              dataKey={config.key}
              name={config.name}
              stroke={config.stroke}
              strokeWidth={2}
              fill={`url(#${config.fillGrad})`}
              stackId="1"
              activeDot={{ r: 5, strokeWidth: 0, fill: config.stroke }}
              dot={false}
              animationDuration={800}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
