import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// 注册必要的 Chart.js 组件和插件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler  // 注册 Filler 插件
);

interface ChartProps {
  data: number[];
  labels: string[];
  title?: string;
  color?: string;
  fill?: boolean;
}

export const Chart: React.FC<ChartProps> = ({
  data,
  labels,
  title = '',
  color = 'rgb(75, 192, 192)',
  fill = true
}) => {
  const chartData = {
    labels,
    datasets: [
      {
        label: title,
        data: data,
        borderColor: color,
        backgroundColor: fill
          ? `${color.replace('rgb', 'rgba').replace(')', ', 0.2)')}`
          : 'transparent',
        tension: 0.4,
        fill: fill ? 'origin' : false,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: !!title,
        text: title,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(200, 200, 200, 0.1)',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    animation: {
      duration: 0,
    },
  };

  return (
    <div className="w-full h-full min-h-[200px]">
      <Line data={chartData} options={options} />
    </div>
  );
};
