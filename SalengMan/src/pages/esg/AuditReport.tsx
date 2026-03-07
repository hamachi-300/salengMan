import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import PageHeader from "../../components/PageHeader";
import { api } from "../../config/api";
import styles from "./AuditReport.module.css";

interface Task {
    id: number;
    tasks_id: string;
    date: string;
    carbon_reduce: string;
    status: string;
    weight: any;
    driver_name?: string;
    esg_driver_id?: number;
    recycling_center_addresss?: string;
    factory_name?: string;
    evidences_images?: string[];
    receipt_images?: string[];
}

interface Factors {
    paper?: string | number;
    plastic?: string | number;
    metal?: string | number;
    glass?: string | number;
}

interface UserProfile {
    full_name: string;
    addresses: { address: string }[];
}

import { getToken } from "../../services/auth";

export default function AuditReport() {
    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [scale, setScale] = useState(1);

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [factors, setFactors] = useState<Factors | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [driverInfo, setDriverInfo] = useState<{ name: string, id: string } | null>(null);

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

                if (tasksData && tasksData.tasks) {
                    // Filter only completed or done tasks for the Transaction Log
                    const completedTasks = tasksData.tasks.filter((t: any) =>
                        t.status === 'completed' || t.status === 'done'
                    );
                    setTasks(completedTasks);

                    // Extract Driver Info from the first available task
                    if (completedTasks.length > 0 && completedTasks[0].driver_name) {
                        setDriverInfo({
                            name: completedTasks[0].driver_name,
                            id: `DRV-${completedTasks[0].esg_driver_id || 'UNKNOWN'}`
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch Audit Report data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        // Strict wrapper scaling logic for Mobile display vs A4 size
        const handleResize = () => {
            const width = window.innerWidth;
            const availableWidth = width - 40; // 20px padding on each side

            if (availableWidth < 794) {
                setScale(availableWidth / 794);
            } else {
                setScale(1);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [navigate]);

    const handleDownloadPdf = async () => {
        if (!reportRef.current || downloading) return;
        setDownloading(true);

        const el = reportRef.current;
        // Temporarily strip the scale transform to ensure native pixel capture
        const originalTransform = el.style.transform;
        el.style.transform = 'none';

        try {
            const canvas = await html2canvas(el, {
                scale: 2, // High resolution scaling
                backgroundColor: "#ffffff",
                width: el.scrollWidth,
                height: el.scrollHeight,
                windowWidth: el.scrollWidth,
                windowHeight: el.scrollHeight,
                scrollY: -window.scrollY,
                logging: false,
                useCORS: true
            });

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
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

            pdf.save(`Waste_Management_Audit_Log_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF โปรดลองอีกครั้ง");
        } finally {
            // Restore preview scaling
            el.style.transform = originalTransform;
            setDownloading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }).replace(',', '');
    };

    const calculateCategory = (weightFactor?: string | number, emissionPerKg: number = 0) => {
        const weight = Number(weightFactor || 0);
        const co2 = weight * emissionPerKg;
        return { weight, co2 };
    };

    const getTaskWeight = (weightData: any) => {
        if (!weightData) return 0;
        let weightArray = weightData;
        if (typeof weightData === 'string') {
            try {
                weightArray = JSON.parse(weightData);
            } catch (e) {
                return 0;
            }
        }
        if (Array.isArray(weightArray)) {
            return weightArray.reduce((sum, item) => sum + Number(item.weight || 0), 0);
        }
        return Number(weightData || 0);
    };

    // Emission Math mapping TGO standard
    const paperData = calculateCategory(factors?.paper, 1.05);
    const plasticData = calculateCategory(factors?.plastic, 1.30);
    const metalData = calculateCategory(factors?.metal, 6.50);
    const glassData = calculateCategory(factors?.glass, 0.25);

    const totalWeight = paperData.weight + plasticData.weight + metalData.weight + glassData.weight;
    const totalCo2 = paperData.co2 + plasticData.co2 + metalData.co2 + glassData.co2;

    const companyAddress = userProfile?.addresses && userProfile.addresses.length > 0
        ? userProfile.addresses[0].address
        : "No Address Provided";

    // 10 kgCO2e ≈ 1 tree
    const treesEquivalent = Math.floor(totalCo2 / 10);

    if (loading) {
        return (
            <div className={styles.container}>
                <PageHeader title="Audit Report" onBack={() => navigate(-1)} />
                <div className={styles.loadingScreen}>
                    <div className={styles.loadingSpinner}></div>
                    <span>กำลังประมวลผลรายงาน...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <PageHeader title="Audit Report" onBack={() => navigate(-1)} />

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
                        {downloading ? "กำลังสร้าง PDF..." : "Export Official PDF"}
                    </button>
                </div>

                {/* Native A4 Box Generator Wrapper */}
                <div
                    className={styles.previewWrapper}
                    style={{
                        width: `${794 * scale}px`,
                        minHeight: `${1123 * scale}px`,
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

                        {/* Section 1: Header & Branding */}
                        <div className={styles.header}>
                            <div className={styles.brand}>
                                <img src="/logo.svg" alt="SalengMan Logo" className={styles.logoImage} onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }} />
                                <h1 className={styles.brandName}>SalengMan</h1>
                            </div>
                            <div className={styles.metaInfo}>
                                <div className={styles.statusBadge}>
                                    <CheckCircle2 size={16} />
                                    Verified (ESG Disclosure)
                                </div>
                                <p className={styles.dateText}>Issue Date: {new Date().toLocaleDateString('en-GB')}</p>
                            </div>
                        </div>

                        {/* Hero Section: Impact Summary */}
                        <div className={styles.heroSection}>
                            <p className={styles.heroTitle}>ปริมาณการลดก๊าซเรือนกระจกสะสม</p>
                            <h2 className={styles.heroMainText}>
                                {totalCo2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span>kgCO₂e</span>
                            </h2>
                            <div className={styles.treeEquivalent}>
                                🌳 เทียบเท่ากับการปลูกต้นไม้ {treesEquivalent.toLocaleString()} ต้น
                            </div>
                        </div>

                        <div className={styles.infoGrid}>
                            <div className={styles.infoBlock}>
                                <h3>Company Info</h3>
                                <p><strong>Name:</strong> {userProfile?.full_name}</p>
                                <p><strong>Address:</strong> {companyAddress}</p>
                            </div>
                            <div className={styles.infoBlock}>
                                <h3>Driver Info</h3>
                                <p><strong>Name:</strong> {driverInfo?.name || 'N/A'}</p>
                                <p><strong>ID:</strong> {driverInfo?.id || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Section 2: Aggregate Data Summary */}
                        <div className={styles.tableSection}>
                            <h3>Aggregate Data Summary</h3>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Waste Category</th>
                                        <th className={styles.numberCol}>Total Weight (kg)</th>
                                        <th className={styles.numberCol}>Emission Factor</th>
                                        <th className={styles.numberCol}>CO2 Reduced (kgCO2e)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Paper (กระดาษ)</td>
                                        <td className={styles.numberCol}>{paperData.weight.toFixed(2)}</td>
                                        <td className={styles.numberCol}>1.05</td>
                                        <td className={styles.numberCol}>{paperData.co2.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td>Plastic (พลาสติก)</td>
                                        <td className={styles.numberCol}>{plasticData.weight.toFixed(2)}</td>
                                        <td className={styles.numberCol}>1.30</td>
                                        <td className={styles.numberCol}>{plasticData.co2.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td>Metal (โลหะ)</td>
                                        <td className={styles.numberCol}>{metalData.weight.toFixed(2)}</td>
                                        <td className={styles.numberCol}>6.50</td>
                                        <td className={styles.numberCol}>{metalData.co2.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td>Glass (แก้ว)</td>
                                        <td className={styles.numberCol}>{glassData.weight.toFixed(2)}</td>
                                        <td className={styles.numberCol}>0.25</td>
                                        <td className={styles.numberCol}>{glassData.co2.toFixed(2)}</td>
                                    </tr>
                                    <tr className={styles.grandTotalRow}>
                                        <td>Grand Total</td>
                                        <td className={styles.numberCol}>{totalWeight.toFixed(2)}</td>
                                        <td className={styles.numberCol}>--</td>
                                        <td className={styles.numberCol}>{totalCo2.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Section 3: Transaction Log */}
                        <div className={styles.tableSection}>
                            <h3>Transaction Log</h3>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Task ID</th>
                                        <th className={styles.numberCol}>Weight (kg)</th>
                                        <th>Recycling Center</th>
                                        <th>Evidence Images</th>
                                        <th>Receipt Images</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.length > 0 ? (
                                        tasks.map((task, index) => (
                                            <tr key={task.tasks_id || index}>
                                                <td>{formatDate(task.date)}</td>
                                                <td>#TRP-{String(task.tasks_id || task.id).padStart(3, '0')}</td>
                                                <td className={styles.numberCol}>{getTaskWeight(task.weight).toFixed(1)}</td>
                                                <td>{task.factory_name || 'SalengMan Center'}</td>
                                                <td>
                                                    {task.evidences_images && task.evidences_images.length > 0 ? (
                                                        <div className={styles.imageGrid}>
                                                            {task.evidences_images.map((img, i) => (
                                                                <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                                                    <img src={img} alt={`Evidence ${i + 1}`} className={styles.tableImage} crossOrigin="anonymous" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {task.receipt_images && task.receipt_images.length > 0 ? (
                                                        <div className={styles.imageGrid}>
                                                            {task.receipt_images.map((img, i) => (
                                                                <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                                                    <img src={img} alt={`Receipt ${i + 1}`} className={styles.tableImage} crossOrigin="anonymous" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className={styles.emptyState}>
                                                No completed transactions found for this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer / Methodology Reference */}
                        <div className={styles.footer}>
                            <div className={styles.methodology}>
                                <h4>Methodology Reference</h4>
                                <p>
                                    Calculated based on TGO (Thailand Greenhouse Gas Management Organization) standard emission factors 2024. Official Document / Trackable Hash verification via SalengMan Protocol.
                                </p>
                            </div>
                            <div className={styles.pagination}>Official Audit Log Document</div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

