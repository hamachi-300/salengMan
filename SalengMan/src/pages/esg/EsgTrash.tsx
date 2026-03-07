import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EsgTrash.module.css";
import PageFooter from "../../components/PageFooter";
import PageHeader from "../../components/PageHeader";
import AlertPopup from "../../components/AlertPopup";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";

function EsgTrash() {
    const navigate = useNavigate();
    const [showInfo, setShowInfo] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{
        history: { month: string, carbon: number }[],
        factors: { paper: number, plastic: number, metal: number, glass: number }
    } | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = getToken();
                if (!token) return;
                const data = await api.getEsgUserStats(token);
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch ESG stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const totalCarbon = stats?.history.reduce((sum, item) => sum + Number(item.carbon), 0) || 0;

    function convertToTreeEquivalent(co2Saved: number): number {
        const CO2_PER_TREE_PER_YEAR = 10;
        return Math.floor(co2Saved / CO2_PER_TREE_PER_YEAR);
    }

    const treeCount = convertToTreeEquivalent(totalCarbon);

    const renderBarChart = (data: { month: string, carbon: number }[], height: number, width: number) => {
        if (!data || data.length === 0) return <div className={styles.emptyChart}>No data</div>;

        const maxCarbon = Math.max(...data.map(d => Number(d.carbon)), 1);
        const barWidth = width / (data.length * 2.5);
        const gap = (width - (data.length * barWidth)) / (data.length + 1);

        return (
            <svg viewBox={`0 0 ${width} ${height + 25}`} className={styles.svgChart}>
                {data.map((d, i) => {
                    const carbonNum = Number(d.carbon);
                    const barHeight = (carbonNum / maxCarbon) * height;
                    const x = gap + i * (barWidth + gap);
                    const y = height - barHeight;

                    return (
                        <g key={d.month}>
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill="#7ecece"
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
                                    from={height}
                                    to={y}
                                    dur="0.8s"
                                    fill="freeze"
                                />
                            </rect>
                            <text
                                x={x + barWidth / 2}
                                y={height + 15}
                                textAnchor="middle"
                                fontSize="10"
                                fill="rgba(255,255,255,0.4)"
                                fontWeight="600"
                            >
                                {d.month.split('-')[1]}/{d.month.split('-')[0].slice(2)}
                            </text>
                            <text
                                x={x + barWidth / 2}
                                y={y - 5}
                                textAnchor="middle"
                                fontSize="10"
                                fill="#fff"
                                fontWeight="700"
                            >
                                {carbonNum.toFixed(0)}
                            </text>
                        </g>
                    );
                })}
                <line
                    x1="0"
                    y1={height}
                    x2={width}
                    y2={height}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="1"
                />
            </svg>
        );
    };

    const renderDonutChart = (factors: any) => {
        if (!factors || typeof factors !== 'object') {
            return <div className={styles.emptyDonut}>ไม่มีข้อมูลวัสดุ</div>;
        }

        const paper = Number(factors.paper || 0);
        const plastic = Number(factors.plastic || 0);
        const metal = Number(factors.metal || 0);
        const glass = Number(factors.glass || 0);
        const total = paper + plastic + metal + glass;

        if (total === 0) return <div className={styles.emptyDonut}>ไม่มีข้อมูลวัสดุ</div>;

        let currentAngle = 0;
        const radius = 40;
        const centerX = 50;
        const centerY = 50;
        const colors = ["#facc15", "#3b82f6", "#94a3b8", "#ec4899"];
        const values = [paper, plastic, metal, glass];

        return (
            <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                {values.map((val, i) => {
                    if (val <= 0) return null;
                    const percentage = val / total;
                    const strokeDasharray = `${percentage * 2 * Math.PI * radius} ${2 * Math.PI * radius}`;
                    const strokeDashoffset = `${-currentAngle * 2 * Math.PI * radius}`;
                    currentAngle += percentage;

                    return (
                        <circle
                            key={i}
                            cx={centerX}
                            cy={centerY}
                            r={radius}
                            fill="none"
                            stroke={colors[i]}
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 50 50)"
                            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                        />
                    );
                })}
                <circle cx={centerX} cy={centerY} r={28} fill="#1e1e1e" />
            </svg>
        );
    };

    return (
        <div className={styles.container}>
            <PageHeader title="ESG Waste" backTo="/home" />

            <div className={styles.content}>
                {/* Chart Card */}
                <div className={styles.chartCard}>
                    <button
                        className={styles.infoButton}
                        aria-label="Information"
                        onClick={() => setShowInfo(true)}
                    >
                        ?
                    </button>

                    <div className={styles.chartArea}>
                        <span className={styles.yAxisLabel}>carbon</span>
                        <div className={styles.chartMockup}>
                            {loading ? (
                                <div className={styles.loadingChart}>Loading...</div>
                            ) : (
                                renderBarChart(stats?.history || [], 80, 50)
                            )}
                        </div>
                        <span className={styles.xAxisLabel}>month</span>
                    </div>

                    <div className={styles.chartStats}>
                        <p className={styles.statPrimary}>carbon reduce: <span className={styles.statValue}>{totalCarbon.toFixed(2)}</span></p>
                        <p className={styles.statSecondary}>เทียบเท่ากับการปลูกต้นไม้ {treeCount} ต้น</p>
                    </div>

                    <button className={styles.showMoreButton} onClick={() => setShowStats(true)}>
                        ดูข้อมูลเพิ่มเติม
                    </button>
                </div>

                {/* Action Buttons Grid */}
                <div className={styles.actionGrid}>
                    <button
                        className={styles.gridButton}
                        onClick={() => navigate('/esg/dispose-trash')}
                    >
                        <div className={styles.serviceIconWrapper}>
                            <svg className={styles.serviceIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                            </svg>
                        </div>
                        <h3 className={styles.serviceTitle}>Dispose Trash</h3>
                        <p className={styles.serviceSubtitle}>ทิ้งขยะ</p>
                    </button>
                    <button
                        className={styles.gridButton}
                        onClick={() => navigate('/esg/report')}
                    >
                        <div className={`${styles.serviceIconWrapper} ${styles.esgColor}`}>
                            <svg className={`${styles.serviceIcon} ${styles.esgColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                        </div>
                        <h3 className={styles.serviceTitle}>ESG Report</h3>
                        <p className={styles.serviceSubtitle}>ออกรายงาน ESG</p>
                    </button>
                </div>

                <button className={styles.menuButton} onClick={() => navigate('/esg/task-history')}>
                    <span>ประวัติการทิ้งขยะ</span>
                    <span className={styles.menuIcon}>›</span>
                </button>
            </div>

            {/* Bottom Button */}
            <PageFooter
                title="เลือกคนทิ้งขยะ"
                onClick={() => navigate('/esg/choose-date-driver')}
                variant="orange"
                showArrow={false}
            />

            <AlertPopup
                isOpen={showInfo}
                title="ESG คืออะไร"
                message={"ESG (Environmental, Social, and Governance) คือ หลักการบริหารจัดการองค์กรที่คำนึงถึงผลกระทบต่อสิ่งแวดล้อม สังคม และการกำกับดูแลกิจการที่ดี\n\nประโยชน์ของ ESG:\nการลงทุนใน ESG ช่วยลดความเสี่ยงด้านสิ่งแวดล้อมและสังคม เพิ่มโอกาสในการเติบโตในระยะยาว และสร้างฐานะทางการเงินที่ยั่งยืนผ่านการบริหารจัดการที่โปร่งใสและตรวจสอบได้"}
                onClose={() => setShowInfo(false)}
            />

            {/* Detailed Stats Popup */}
            {showStats && (
                <div className={styles.modalOverlay} onClick={() => setShowStats(false)}>
                    <div className={styles.popupContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.popupHeader}>
                            <h3>สถิติโดยละเอียด</h3>
                            <button className={styles.closePopup} onClick={() => setShowStats(false)}>×</button>
                        </div>
                        <div className={styles.popupBody}>
                            <div className={styles.chartSection}>
                                <span className={styles.chartLabel}>Carbon Reduction Trend</span>
                                <div className={styles.popupLineChart}>
                                    {renderBarChart(stats?.history || [], 80, 50)}
                                </div>
                            </div>

                            <div className={styles.chartSection}>
                                <span className={styles.chartLabel}>Material Breakdown (kg)</span>
                                <div className={styles.donutSection}>
                                    <div className={styles.donutWrapper}>
                                        {renderDonutChart(stats?.factors)}
                                    </div>
                                    <div className={styles.materialsList}>
                                        <div className={styles.materialItem}>
                                            <span className={styles.materialLabel}>
                                                <span className={`${styles.materialDot} ${styles["material-paper"]}`} /> Paper
                                            </span>
                                            <span className={styles.materialValue}>{Number(stats?.factors?.paper || 0).toFixed(1)}</span>
                                        </div>
                                        <div className={styles.materialItem}>
                                            <span className={styles.materialLabel}>
                                                <span className={`${styles.materialDot} ${styles["material-plastic"]}`} /> Plastic
                                            </span>
                                            <span className={styles.materialValue}>{Number(stats?.factors?.plastic || 0).toFixed(1)}</span>
                                        </div>
                                        <div className={styles.materialItem}>
                                            <span className={styles.materialLabel}>
                                                <span className={`${styles.materialDot} ${styles["material-metal"]}`} /> Metal
                                            </span>
                                            <span className={styles.materialValue}>{Number(stats?.factors?.metal || 0).toFixed(1)}</span>
                                        </div>
                                        <div className={styles.materialItem}>
                                            <span className={styles.materialLabel}>
                                                <span className={`${styles.materialDot} ${styles["material-glass"]}`} /> Glass
                                            </span>
                                            <span className={styles.materialValue}>{Number(stats?.factors?.glass || 0).toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.impactSection} style={{ border: '1px solid #7ecece', background: 'transparent' }}>
                                <div className={styles.impactInfo}>
                                    <h4 style={{ color: '#7ecece' }}>รวมค่า CARBON ที่ลดได้</h4>
                                    <div className={styles.impactHighlight}>
                                        <span className={styles.impactNumber}>{totalCarbon.toFixed(2)}</span>
                                        <span className={styles.impactUnit} style={{ color: '#7ecece' }}>kg</span>
                                    </div>
                                </div>
                                <div className={styles.impactBadge} style={{ background: 'rgba(126, 206, 206, 0.1)', color: '#7ecece' }}>
                                    <span>🌳</span>
                                    <span>{treeCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default EsgTrash;
