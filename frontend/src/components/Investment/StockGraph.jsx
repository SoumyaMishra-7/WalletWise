import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const StockGraph = ({ stockData }) => {
    if (!stockData || !stockData.history) return null;

    const labels = stockData.history.map(point => {
        // Convert 'YYYY-MM-DD' down to 'MMM DD'
        const date = new Date(point.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const dataPoints = stockData.history.map(point => point.price);

    const isPositive = dataPoints[dataPoints.length - 1] >= dataPoints[0];
    const lineColor = isPositive ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'; // Tailwind green-500 or red-500
    const bgColor = isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';

    const data = {
        labels,
        datasets: [
            {
                label: `${stockData.symbol} Price`,
                data: dataPoints,
                borderColor: lineColor,
                backgroundColor: bgColor,
                tension: 0.3, // smooth curves
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 6
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: (context) => `$${context.raw.toFixed(2)}` // Assume simulated prices display as dollar values for familiarity, even if WWC
                }
            }
        },
        scales: {
            x: {
                grid: { display: false }
            },
            y: {
                grid: { color: 'rgba(200, 200, 200, 0.2)' },
                ticks: {
                    callback: (value) => `$${value}`
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <Line data={data} options={options} />
        </div>
    );
};

export default StockGraph;
