import React from 'react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import type { TooltipValueType } from 'recharts';
import type { NameType, Payload as TooltipPayloadEntry } from 'recharts/types/component/DefaultTooltipContent';

interface PieData {
  name: string;
  value: number;
  percent?: number;
}

interface PieChartProps {
  data: PieData[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  colors?: string[];
  showLegend?: boolean;
}

// 預設配色 (藍、灰、綠、橘、紫)
const DEFAULT_COLORS = [
  '#3b82f6', // 藍 (美股/台股)
  '#64748b', // 灰色 (債券/基金)
  '#10b981', // 綠色 (現金)
  '#f59e0b', // 橘色 (加密貨幣)
  '#8b5cf6'  // 紫色
];

export const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 260,
  innerRadius = 60,
  outerRadius = 80,
  colors = DEFAULT_COLORS,
  showLegend = true
}) => {
  // 過濾掉值為 0 的數據，避免渲染錯誤與視覺干擾
  const filteredData = data.filter(item => item.value > 0);
  
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);
  const chartData = filteredData.map(item => ({
    ...item,
    percent: total > 0 ? (item.value / total) * 100 : 0
  }));

  return (
    <div style={{ width: '100%', height }} className="select-none flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            dataKey="value"
            animationDuration={600}
          >
            {chartData.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]} 
                className="transition-all duration-300 hover:opacity-85 focus:outline-none"
              />
            ))}
          </Pie>
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '16px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              boxShadow: '0 10px 15px -3px rgba(148, 163, 184, 0.1)',
              backdropFilter: 'blur(8px)',
              padding: '8px 12px'
            }}
            itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
            formatter={(value: TooltipValueType, name: NameType, entry: TooltipPayloadEntry) => {
              if (value === undefined) return ['', name];
              const pct = entry.payload.percent;
              return [`$${Number(value).toLocaleString()} 元 (${pct.toFixed(1)}%)`, name];
            }}
          />
          
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};
