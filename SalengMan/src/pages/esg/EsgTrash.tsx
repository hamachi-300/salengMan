import styles from "./EsgTrash.module.css";
import PageFooter from "../../components/PageFooter";
import PageHeader from "../../components/PageHeader";

function EsgTrash() {
    return (
        <div className={styles.container}>
            <PageHeader title="ESG Waste" />

            <div className={styles.content}>
                {/* Chart Card */}
                <div className={styles.chartCard}>
                    <div className={styles.chartArea}>
                        <span className={styles.yAxisLabel}>carbon</span>
                        <div className={styles.chartMockup}>
                            {/* Simple SVG Line Chart Mockup */}
                            <svg viewBox="0 0 200 80" className={styles.svgChart}>
                                <polyline
                                    fill="none"
                                    stroke="#7ecece"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    points="5,50 15,35 25,45 35,20 45,5 55,25 65,30 75,28 85,35 95,40 105,45 115,50 125,48 135,55 145,55"
                                />
                            </svg>
                            <div className={styles.xAxisLine}></div>
                            <div className={styles.yAxisLine}></div>
                        </div>
                        <span className={styles.xAxisLabel}>month</span>
                    </div>

                    <div className={styles.chartStats}>
                        <p className={styles.statPrimary}>carbon reduce: <span className={styles.statValue}>0</span></p>
                        <p className={styles.statSecondary}>เทียบเท่ากับการปลูกต้นไม้ 0 ต้น</p>
                    </div>
                </div>

                {/* Action Buttons Grid */}
                <div className={styles.actionGrid}>
                    <button className={styles.gridButton}>
                        <div className={styles.serviceIconWrapper}>
                            <svg className={styles.serviceIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                            </svg>
                        </div>
                        <h3 className={styles.serviceTitle}>Dispose Trash</h3>
                        <p className={styles.serviceSubtitle}>ทิ้งขยะ</p>
                    </button>
                    <button className={styles.gridButton}>
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
            </div>

            {/* Bottom Button */}
            <PageFooter
                title="เลือกคนทิ้งขยะ"
                onClick={() => { }}
                variant="orange"
                showArrow={false}
            />
        </div>
    );
}

export default EsgTrash;
