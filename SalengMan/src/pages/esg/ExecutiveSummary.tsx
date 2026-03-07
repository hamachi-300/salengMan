import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, CheckCircle2 } from "lucide-react";

import styles from "./ExecutiveSummary.module.css";
import PageHeader from "../../components/PageHeader";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";

interface Factors {
    paper: number;
    plastic: number;
    metal: number;
    glass: number;
}

function ExecutiveSummary() {
    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [scale, setScale] = useState(1);
    const [stats, setStats] = useState<{ factors: Factors | null, subDate: Date | null, totalCarbon: number }>({ factors: null, subDate: null, totalCarbon: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = getToken();
                if (!token) return;

                const [statsData, tasksData] = await Promise.all([
                    api.getEsgUserStats(token),
                    api.getEsgTaskHistory(token)
                ]);

                let calcTotalCarbon = 0;
                if (tasksData && tasksData.tasks) {
                    tasksData.tasks.forEach(task => {
                        if ((task.status === 'completed' || task.status === 'done') && task.carbon_reduce) {
                            calcTotalCarbon += parseFloat(task.carbon_reduce);
                        }
                    });
                }

                setStats({
                    factors: statsData.factors,
                    subDate: statsData.subscription_date ? new Date(statsData.subscription_date) : new Date(),
                    totalCarbon: calcTotalCarbon
                });
            } catch (error) {
                console.error("Failed to fetch ESG stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();

        const handleResize = () => {
            const width = window.innerWidth;
            const horizontalPadding = 40; // 20px on each side
            const availableWidth = width - horizontalPadding;

            if (availableWidth < 794) {
                setScale(availableWidth / 794);
            } else {
                setScale(1);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDownloadPdf = async () => {
        if (!reportRef.current || downloading) return;
        setDownloading(true);

        const el = reportRef.current;
        const originalTransform = el.style.transform;
        el.style.transform = 'none'; // Temporarily remove scale for canvas capture

        try {
            const canvas = await html2canvas(el, {
                scale: 2, // Higher resolution
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 794,
                height: 1123,
                windowWidth: 794,
                windowHeight: 1123
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`ESG_Executive_Summary_${new Date().getFullYear()}.pdf`);
        } catch (err) {
            console.error("Error generating PDF:", err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            if (el) el.style.transform = originalTransform;
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <PageHeader title="Executive Summary" onBack={() => navigate(-1)} />
                <div className={styles.loadingScreen}>
                    <div className={styles.loadingSpinner}></div>
                    <span>กำลังประมวลผลรายงาน...</span>
                </div>
            </div>
        );
    }

    const { factors, subDate, totalCarbon } = stats;

    // Fallback data if no factors found
    const data = factors || { paper: 0, plastic: 0, metal: 0, glass: 0 };

    const totalWeight = data.paper + data.plastic + data.metal + data.glass;

    // 10 kgCO2e ≈ 1 tree
    const treesEquivalent = Math.floor(totalCarbon / 10);

    // Date formatting
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const periodText = `${subDate ? formatDate(subDate) : '-'} to ${formatDate(new Date())}`;

    // Pie chart logic using EsgTrash identical layout calculations
    const paper = Number(data.paper || 0);
    const plastic = Number(data.plastic || 0);
    const metal = Number(data.metal || 0);
    const glass = Number(data.glass || 0);
    const total = paper + plastic + metal + glass;

    const pieData = [
        { label: 'พลาสติก', weight: plastic, color: '#3b82f6', percent: 0 },
        { label: 'กระดาษ', weight: paper, color: '#facc15', percent: 0 },
        { label: 'โลหะ', weight: metal, color: '#94a3b8', percent: 0 },
        { label: 'แก้ว', weight: glass, color: '#ec4899', percent: 0 },
    ].filter(item => item.weight > 0).sort((a, b) => b.weight - a.weight);

    let currentAngle = 0;
    const radius = 40;
    const centerX = 50;
    const centerY = 50;

    const chartElements = pieData.map((item) => {
        if (item.weight <= 0) return null;

        const percentage = total > 0 ? (item.weight / total) : 0;
        item.percent = Math.round(percentage * 100);

        const strokeDasharray = `${percentage * 2 * Math.PI * radius} ${2 * Math.PI * radius}`;
        const strokeDashoffset = `${-currentAngle * 2 * Math.PI * radius}`;
        currentAngle += percentage;

        return (
            <circle
                key={item.label}
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
        );
    });

    return (
        <div className={styles.container}>
            <PageHeader title="Executive Summary" onBack={() => navigate(-1)} />

            <div className={styles.scrollArea}>
                <div className={styles.actions}>
                    <button
                        className={styles.downloadButton}
                        onClick={handleDownloadPdf}
                        disabled={downloading}
                    >
                        {downloading ? (
                            <div className={styles.loadingSpinner}></div>
                        ) : (
                            <Download size={20} />
                        )}
                        {downloading ? "กำลังสร้าง PDF..." : "Download PDF"}
                    </button>
                </div>

                {/* The element to be captured as PDF */}
                <div
                    className={styles.previewWrapper}
                    style={{
                        width: `${794 * scale}px`,
                        height: `${1123 * scale}px`,
                        margin: '0 auto',
                        position: 'relative'
                    }}
                >
                    <div
                        className={styles.reportDocument}
                        ref={reportRef}
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            position: 'absolute',
                            top: 0,
                            left: 0
                        }}
                    >

                        {/* Header */}
                        <div className={styles.header}>
                            <div className={styles.brand}>
                                <img src="/logo.svg" alt="SalengMan Logo" className={styles.logoImage} onError={(e) => {
                                    // Fallback if logo not found
                                    e.currentTarget.style.display = 'none';
                                }} />
                                <h1 className={styles.brandName}>SalengMan</h1>
                            </div>
                            <div className={styles.reportInfo}>
                                <h2 className={styles.reportTitle}>ESG Monthly Performance Report</h2>
                                <p className={styles.reportPeriod}>{periodText}</p>
                            </div>
                        </div>

                        {/* Hero Section */}
                        <div className={styles.heroSection}>
                            <p className={styles.heroTitle}>คุณช่วยลดก๊าซเรือนกระจกได้ทั้งหมด</p>
                            <h2 className={styles.heroMainText}>
                                {totalCarbon.toLocaleString()} <span>kgCO₂e</span>
                            </h2>
                            <div className={styles.treeEquivalent}>
                                🌳 เทียบเท่ากับการปลูกต้นไม้ {treesEquivalent.toLocaleString()} ต้น
                            </div>
                        </div>

                        {/* Breakdown Section */}
                        <div className={styles.breakdownSection}>
                            <h3 className={styles.sectionTitle}>สัดส่วนขยะ (Waste Breakdown)</h3>

                            <div className={styles.chartContainer}>
                                {totalWeight > 0 ? (
                                    <>
                                        <div className={styles.donutWrapper}>
                                            <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                                                <circle cx={50} cy={50} r={40} fill="none" stroke="#e2e8f0" strokeWidth="12" />
                                                {chartElements}
                                                <circle cx={50} cy={50} r={28} fill="#ffffff" />
                                            </svg>
                                        </div>
                                        <div className={styles.legendContainer}>
                                            {pieData.map((item) => (
                                                <div key={item.label} className={styles.legendItem}>
                                                    <div className={styles.legendLabel}>
                                                        <div className={styles.legendColor} style={{ backgroundColor: item.color }} />
                                                        {item.label}
                                                    </div>
                                                    <div className={styles.legendValue}>
                                                        {item.percent}% <span>({item.weight} kg)</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <p style={{ color: '#64748b' }}>ยังไม่มีข้อมูลขยะ</p>
                                )}
                            </div>
                        </div>

                        {/* Footer / Verification Stamp */}
                        <div className={styles.footerSection}>
                            <div className={styles.verifiedStamp}>
                                <CheckCircle2 size={32} />
                                <div className={styles.verifiedText}>
                                    <span className={styles.verifiedTitle}>100% Traceable</span>
                                    <span className={styles.verifiedSub}>Verified by SalengMan Platform</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default ExecutiveSummary;
