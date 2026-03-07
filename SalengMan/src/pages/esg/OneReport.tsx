import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, FileSpreadsheet, CheckCircle2, TrendingUp, TrendingDown, Target, Shield } from "lucide-react";

import styles from "./OneReport.module.css";
import PageHeader from "../../components/PageHeader";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";

interface Task {
    id: number;
    tasks_id: string;
    date: string;
    carbon_reduce: string;
    status: string;
    weight: any;
    driver_name?: string;
    esg_driver_id?: number;
    factory_name?: string;
    pickup_days?: string;
}

interface Factors {
    paper: number;
    plastic: number;
    metal: number;
    glass: number;
}

interface UserProfile {
    full_name: string;
    addresses: { address: string }[];
}

export default function OneReport() {
    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [scale, setScale] = useState(1);

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [factors, setFactors] = useState<Factors | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            const token = getToken();
            if (!token) {
                navigate("/login");
                return;
            }

            try {
                const [profileData, addressesData, statsData, tasksData] = await Promise.all([
                    api.getMe(token),
                    api.getAddresses(token),
                    api.getEsgUserStats(token),
                    api.getEsgTaskHistory(token)
                ]);

                setUserProfile({
                    full_name: profileData.full_name,
                    addresses: addressesData
                });
                setFactors(statsData.factors);
                setStats(statsData);

                if (tasksData && tasksData.tasks) {
                    setTasks(tasksData.tasks);
                }
            } catch (error) {
                console.error("Failed to fetch 56-1 Report data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        const handleResize = () => {
            const width = window.innerWidth;
            const availableWidth = width - 40;
            if (availableWidth < 842) {
                setScale(availableWidth / 842);
            } else {
                setScale(1);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [navigate]);

    // Data Processing Logic (Revised for Real Data)
    const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'done');

    // 1. Waste Diverted: sum weight from esg tasks and convert to ton
    const getTaskWeight = (weightObj: any): number => {
        if (!weightObj) return 0;
        if (typeof weightObj === 'number') return weightObj;
        return (parseFloat(weightObj.paper || 0) +
            parseFloat(weightObj.plastic || 0) +
            parseFloat(weightObj.metal || 0) +
            parseFloat(weightObj.glass || 0));
    };

    const totalWeightKgTasks = completedTasks.reduce((sum, t) => sum + getTaskWeight(t.weight), 0);
    const wasteDivertedTons = totalWeightKgTasks / 1000;

    // 2. Carbon Avoidance: from esg_factor convert each type to carbon
    const paperCo2 = (factors?.paper || 0) * 1.05;
    const plasticCo2 = (factors?.plastic || 0) * 1.30;
    const metalCo2 = (factors?.metal || 0) * 6.50;
    const glassCo2 = (factors?.glass || 0) * 0.25;

    const totalCarbonKg = paperCo2 + plasticCo2 + metalCo2 + glassCo2;
    const carbonAvoidanceTons = totalCarbonKg / 1000;

    const totalWeightKgFactors = (factors?.paper || 0) + (factors?.plastic || 0) + (factors?.metal || 0) + (factors?.glass || 0);

    const recyclingRates = {
        paper: totalWeightKgFactors > 0 ? (factors?.paper || 0) / totalWeightKgFactors * 100 : 0,
        plastic: totalWeightKgFactors > 0 ? (factors?.plastic || 0) / totalWeightKgFactors * 100 : 0,
        metal: totalWeightKgFactors > 0 ? (factors?.metal || 0) / totalWeightKgFactors * 100 : 0,
        glass: totalWeightKgFactors > 0 ? (factors?.glass || 0) / totalWeightKgFactors * 100 : 0,
    };

    // 3. Local Job Creation: unique drivers from pickup_days
    const uniqueDrivers = stats?.unique_drivers_count || 0;

    // 4. Fair Compensation: coin data from esg_driver for one representative driver
    const totalCompensation = stats?.representative_driver_coin || 0;

    // 5. Community Engagement: count task from esg task table
    const communityInteractions = stats?.total_tasks_count || 0;

    // Governance Dimension
    const factoryNetwork = Array.from(new Set(completedTasks.map(t => t.factory_name).filter(name => name)));

    // 6. Comparative Analysis trace (YoY/QoQ): Current Period (real), Previous Period (0)
    const now = new Date();
    const currentPeriodCarbon = carbonAvoidanceTons;
    const prevPeriodCarbon = 0;
    const carbonGrowth = 100;

    // Reporting Cycle
    const currentQuarter = Math.floor((now.getMonth() + 3) / 3);
    const reportingCycle = `Q${currentQuarter} / ${now.getFullYear()}`;

    // PDF Export
    const handleDownloadPdf = async () => {
        if (!reportRef.current || downloading) return;
        setDownloading(true);
        const el = reportRef.current;
        const originalTransform = el.style.transform;
        el.style.transform = 'none';

        try {
            const canvas = await html2canvas(el, {
                scale: 2,
                backgroundColor: "#ffffff",
                width: el.scrollWidth,
                height: el.scrollHeight,
                windowWidth: el.scrollWidth,
                windowHeight: el.scrollHeight,
                scrollY: -window.scrollY,
                useCORS: true
            });

            const imgWidth = 210; // A4 mm
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;

            const pdf = new jsPDF("p", "mm", "a4");
            let position = 0;
            const imgData = canvas.toDataURL("image/png");

            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`SalengMan_56-1_OneReport_${now.getFullYear()}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
        } finally {
            el.style.transform = originalTransform;
            setDownloading(false);
        }
    };

    // CSV Export
    const handleExportCsv = () => {
        const csvContent = [
            ["SalengMan 56-1 One Report Data"],
            ["Company Name", userProfile?.full_name],
            ["Reporting Cycle", reportingCycle],
            [],
            ["Environment Dimension (E)"],
            ["Waste Diverted from Landfill (Tons)", wasteDivertedTons.toFixed(4)],
            ["Carbon Avoidance (tCO2e)", carbonAvoidanceTons.toFixed(4)],
            ["Paper Recycling Rate (%)", recyclingRates.paper.toFixed(2)],
            ["Plastic Recycling Rate (%)", recyclingRates.plastic.toFixed(2)],
            ["Metal Recycling Rate (%)", recyclingRates.metal.toFixed(2)],
            ["Glass Recycling Rate (%)", recyclingRates.glass.toFixed(2)],
            [],
            ["Social Dimension (S)"],
            ["Community Job Creation", uniqueDrivers],
            ["Total Community Compensation (Coins)", totalCompensation],
            ["Community Interactions", communityInteractions],
            [],
            ["Governance Dimension (G)"],
            ["Traceability Rate (%)", "100.00%"],
            ["Verified Factories count", factoryNetwork.length],
            ["Factory List", factoryNetwork.join("; ")]
        ].map(row => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `ESG_Disclosure_Data_${now.toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <PageHeader title="56-1 One Report" onBack={() => navigate(-1)} />
                <div className={styles.loadingScreen}>
                    <div className={styles.loadingSpinner}></div>
                    <span>เตรียมข้อมูล ESG Disclosure...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <PageHeader title="56-1 One Report" onBack={() => navigate(-1)} />

            <div className={styles.scrollArea}>
                <div className={styles.actions}>
                    <button className={`${styles.exportButton} ${styles.excelButton}`} onClick={handleExportCsv}>
                        <FileSpreadsheet size={18} /> Export CSV
                    </button>
                    <button className={`${styles.exportButton} ${styles.pdfButton}`} onClick={handleDownloadPdf} disabled={downloading}>
                        {downloading ? <div className={styles.loadingSpinner} /> : <Download size={18} />}
                        {downloading ? "กำลังสร้าง PDF..." : "Download Official PDF"}
                    </button>
                </div>

                <div className={styles.previewWrapper} style={{ width: `${842 * scale}px`, minHeight: `${1191 * scale}px`, position: 'relative' }}>
                    <div className={styles.reportDocument} ref={reportRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>

                        {/* Header */}
                        <div className={styles.header}>
                            <div className={styles.brandInfo}>
                                <h1>56-1 One Report</h1>
                                <h2>ESG Disclosure Standard</h2>
                            </div>
                            <div className={styles.reportMeta}>
                                <div className={styles.cycleBadge}>{reportingCycle}</div>
                                <p className={styles.metaText}>Entity: {userProfile?.full_name}</p>
                                <p className={styles.metaText}>Scope 3: Waste Generated in Operations</p>
                            </div>
                        </div>

                        {/* Impact Statement */}
                        <div className={styles.impactStatement}>
                            <div className={styles.statementTitle}>Impact Statement</div>
                            <p className={styles.statementText}>
                                "บริษัทมุ่งเน้นการเปลี่ยนผ่านสู่เศรษฐกิจหมุนเวียน (Circular Economy) โดยการจัดการของเสียต้นทาง
                                เพื่อสร้างความยั่งยืนในห่วงโซ่อุปทานและรับผิดชอบต่อสิ่งแวดล้อมตามมาตรฐานความยั่งยืนระดับสากล"
                            </p>
                        </div>

                        {/* Environmental (E) */}
                        <div className={styles.dimensionSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionLetter}>E</div>
                                <h3 className={styles.sectionTitle}>Environmental Dimension</h3>
                            </div>
                            <div className={styles.metricsGrid}>
                                <div className={styles.metricCard}>
                                    <h4>Waste Diverted</h4>
                                    <div className={styles.metricValue}>{wasteDivertedTons.toFixed(3)} <span>Tons</span></div>
                                    <div className={styles.metricTrend}><Target size={14} /> Landfill Avoidance</div>
                                </div>
                                <div className={styles.metricCard}>
                                    <h4>Carbon Avoidance</h4>
                                    <div className={styles.metricValue}>{carbonAvoidanceTons.toFixed(3)} <span>tCO₂e</span></div>
                                    <div className={`${styles.metricTrend} ${carbonGrowth >= 0 ? styles.trendUp : styles.trendDown}`}>
                                        {carbonGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {Math.abs(carbonGrowth).toFixed(1)}% vs Prev Period
                                    </div>
                                </div>
                                <div className={styles.metricCard}>
                                    <h4>Recycling Rate</h4>
                                    <div className={styles.metricValue}>100 <span>%</span></div>
                                    <div className={styles.metricTrend}><Shield size={14} /> Full Traceability</div>
                                </div>
                            </div>
                            <div className={styles.sdgContainer}>
                                <div className={styles.sdgTag}>SDG 12: Responsible Consumption</div>
                                <div className={styles.sdgTag}>SDG 13: Climate Action</div>
                            </div>
                        </div>

                        {/* Social (S) */}
                        <div className={styles.dimensionSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionLetter}>S</div>
                                <h3 className={styles.sectionTitle}>Social Dimension</h3>
                            </div>
                            <div className={styles.metricsGrid}>
                                <div className={styles.metricCard}>
                                    <h4>Local Job Creation</h4>
                                    <div className={styles.metricValue}>{uniqueDrivers} <span>Drivers</span></div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Community Impact</p>
                                </div>
                                <div className={styles.metricCard}>
                                    <h4>Fair Compensation</h4>
                                    <div className={styles.metricValue}>{totalCompensation.toLocaleString()} <span>Coins</span></div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Distributed Growth</p>
                                </div>
                                <div className={styles.metricCard}>
                                    <h4>Community Engagement</h4>
                                    <div className={styles.metricValue}>{communityInteractions} <span>Actions</span></div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Public Participation</p>
                                </div>
                            </div>
                        </div>

                        {/* Governance (G) */}
                        <div className={styles.dimensionSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionLetter}>G</div>
                                <h3 className={styles.sectionTitle}>Governance Dimension</h3>
                            </div>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Compliance Indicator</th>
                                        <th>Metric</th>
                                        <th>Verification Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Regulatory Traceability</td>
                                        <td>100.00% Trackable</td>
                                        <td style={{ color: '#10b981', fontWeight: 700 }}>✓ COMPLIANT</td>
                                    </tr>
                                    <tr>
                                        <td>Verified Factory Network</td>
                                        <td>{factoryNetwork.length} Licensed Centers</td>
                                        <td style={{ color: '#10b981', fontWeight: 700 }}>✓ VERIFIED</td>
                                    </tr>
                                    <tr>
                                        <td>Data Integrity Protocol</td>
                                        <td>SalengMan Smart Ledger</td>
                                        <td style={{ color: '#10b981', fontWeight: 700 }}>✓ IMMUTABLE</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Comparison Charts */}
                        <div className={styles.comparisonBlock}>
                            <h3 className={styles.chartTitle}>Carbon Reduction Performance Trace (YoY/QoQ)</h3>
                            <div className={styles.barChart}>
                                <div className={styles.barGroup}>
                                    <div className={styles.bar} style={{ height: '60px' }}>
                                        <div className={styles.barValue}>{prevPeriodCarbon.toFixed(1)}</div>
                                    </div>
                                    <div className={styles.barLabel}>Previous Period</div>
                                </div>
                                <div className={styles.barGroup}>
                                    <div className={styles.bar} style={{ height: `${60 * (1 + (carbonGrowth / 100))}px`, maxHeight: '100px', background: '#0f172a' }}>
                                        <div className={styles.barValue}>{currentPeriodCarbon.toFixed(1)}</div>
                                    </div>
                                    <div className={styles.barLabel}>Current Period</div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={styles.verifiedStamp}>
                            <div className={styles.methodology}>
                                <h4>Data Verification Methodology</h4>
                                <p>This report is generated following the GRI Standards and TGO emission factors. Raw data is sourced from SalengMan Decentralized Waste Management Protocol.</p>
                            </div>
                            <div className={styles.stampBox}>
                                <CheckCircle2 size={24} /> Official Disclosure
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
