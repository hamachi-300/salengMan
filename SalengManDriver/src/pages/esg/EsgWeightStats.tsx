import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EsgWeightStats.module.css';
import PageHeader from '../../components/PageHeader';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';

interface StatData {
    month: string;
    weight: number;
}

const EsgWeightStats: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<StatData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = getToken();
                if (!token) return;
                const data = await api.getEsgDriverWeightStats(token);
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch weight stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const renderChart = () => {
        if (stats.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <p>ยังไม่มีข้อมูลสถิติการรับขยะ</p>
                </div>
            );
        }

        const maxWeight = Math.max(...stats.map(s => s.weight), 10);
        const chartHeight = 180;
        const chartWidth = 300;
        const barWidth = 30;
        const gap = (chartWidth - (stats.length * barWidth)) / (stats.length + 1);

        return (
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} className={styles.svgChart}>
                {stats.map((stat, index) => {
                    const weightNum = Number(stat.weight || 0);
                    const barHeight = (weightNum / maxWeight) * chartHeight;
                    const x = gap + index * (barWidth + gap);
                    const y = chartHeight - barHeight;

                    return (
                        <g key={stat.month}>
                            {/* Bar */}
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill="#22c55e"
                                rx="4"
                            >
                                <animate
                                    attributeName="height"
                                    from="0"
                                    to={barHeight}
                                    dur="0.8s"
                                    fill="freeze"
                                />
                                <animate
                                    attributeName="y"
                                    from={chartHeight}
                                    to={y}
                                    dur="0.8s"
                                    fill="freeze"
                                />
                            </rect>

                            {/* Label (Month) */}
                            <text
                                x={x + barWidth / 2}
                                y={chartHeight + 20}
                                textAnchor="middle"
                                fontSize="10"
                                fill="#aaa"
                                fontWeight="600"
                            >
                                {stat.month.split('-')[1]}/{stat.month.split('-')[0].slice(2)}
                            </text>

                            {/* Value (Weight) */}
                            <text
                                x={x + barWidth / 2}
                                y={y - 8}
                                textAnchor="middle"
                                fontSize="10"
                                fill="#fff"
                                fontWeight="700"
                            >
                                {weightNum.toFixed(0)}
                            </text>
                        </g>
                    );
                })}
                {/* X-Axis line */}
                <line
                    x1="0"
                    y1={chartHeight}
                    x2={chartWidth}
                    y2={chartHeight}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="1"
                />
            </svg>
        );
    };

    return (
        <div className={styles.container}>
            <PageHeader title="สถิติขยะสะสม" onBack={() => navigate('/esg/driver')} />

            <div className={styles.content}>
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>ปริมาณขยะรายเดือน</h3>
                        <p className={styles.chartSubtitle}>แสดงน้ำหนักขยะที่คุณจัดการได้ในแต่ละเดือน (kg)</p>
                    </div>

                    <div className={styles.chartWrapper}>
                        {loading ? (
                            <div className={styles.loadingWrapper}>
                                <div className={styles.spinner}></div>
                                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>กำลังประมวลผลข้อมูล...</p>
                            </div>
                        ) : (
                            renderChart()
                        )}
                    </div>
                </div>

                {!loading && stats.length > 0 && (
                    <div className={styles.historySection}>
                        <h4 className={styles.sectionTitle}>รายละเอียดรายเดือน</h4>
                        <div className={styles.historyList}>
                            {[...stats].reverse().map(stat => {
                                const weightNum = Number(stat.weight || 0);
                                return (
                                    <div key={stat.month} className={styles.historyItem}>
                                        <span className={styles.monthLabel}>
                                            {new Date(stat.month + '-01').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <span className={styles.weightValue}>{weightNum.toFixed(1)} kg</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EsgWeightStats;
