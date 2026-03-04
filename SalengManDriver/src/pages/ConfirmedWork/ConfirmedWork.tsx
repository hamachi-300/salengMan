import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import { useUser } from "../../context/UserContext";
import styles from "./ConfirmedWork.module.css";

const API_URL = import.meta.env.VITE_API_URL;

function ConfirmedWork() {
    const { user } = useUser();
    const [works, setWorks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const parsePickupTime = (dateString: any) => {
        if (!dateString) return null;
        let parsed = dateString;
        try {
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        } catch (e) { }
        return (parsed && typeof parsed === 'object') ? parsed : null;
    };

    const formatDate = (dateString: any, isFallback: boolean = false) => {
        if (!dateString) return 'รอระบุ';

        const pt = parsePickupTime(dateString);
        if (pt && pt.date) {
            const d = new Date(pt.date);
            if (!isNaN(d.getTime())) {
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            }
            return pt.date;
        }

        let cleanStr = dateString;
        if (typeof dateString === 'string' && dateString.startsWith('"') && dateString.endsWith('"')) {
            cleanStr = dateString.slice(1, -1);
        }
        const date = new Date(cleanStr);
        if (isNaN(date.getTime())) return typeof cleanStr === 'string' ? cleanStr : "รอระบุ";

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formatted = `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        return isFallback ? `${formatted} (เวลาโพสต์)` : formatted;
    };

    const formatTime = (dateString: any, isFallback: boolean = false) => {
        if (!dateString) return 'รอระบุ';

        const pt = parsePickupTime(dateString);
        if (pt && pt.startTime && pt.endTime) {
            return `${pt.startTime} - ${pt.endTime}`;
        }

        let cleanStr = dateString;
        if (typeof dateString === 'string' && dateString.startsWith('"') && dateString.endsWith('"')) {
            cleanStr = dateString.slice(1, -1);
        }
        const date = new Date(cleanStr);
        if (isNaN(date.getTime())) return typeof cleanStr === 'string' ? cleanStr : "รอระบุ";

        const timeStr = date.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
        });
        return isFallback ? `${timeStr} (เวลาโพสต์)` : timeStr;
    };

    useEffect(() => {
        if (!user?.id) return;
        if (user) fetchConfirmedWorks();
        const intervalId = setInterval(() => {
            console.log("Auto-refreshing confirmed works...");
            fetchConfirmedWorks();
        }, 5000);
        return () => clearInterval(intervalId);
    }, [user?.id]);

    const fetchConfirmedWorks = async () => {
        try {
            const token = localStorage.getItem("auth_token"); // ใช้ชื่อให้ตรงกับหน้าอื่น
            const res = await fetch(`${API_URL}/contacts`, { // ดึงงานทั้งหมดแล้วมา filter ด้านหน้า
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            const confirmedContacts = data.filter((w: any) => w.status?.toLowerCase() === "confirmed");
            setWorks(confirmedContacts);
        } catch (err) {
            console.error("Error fetching works:", err);
        } finally {
            if (loading) setLoading(false);
        }
    };

    return (
        <div className={styles["page-container"]}>
            <PageHeader title="ตารางงานที่รับไว้" backTo="/home" />

            <div className={styles.content}>
                {loading ? <p className={styles.empty}>กำลังโหลดตารางงาน...</p> : null}

                {works.length === 0 && !loading ? (
                    <p className={styles.empty}>ยังไม่มีคิวงานที่ยืนยันไว้</p>
                ) : (
                    works.map((job) => (
                        <div key={job.id} className={styles.workCard}>
                            <div className={styles.contentWrapper}>
                                <div className={styles.imageContainer}>
                                    {job.images && job.images.length > 0 ? (
                                        <img src={job.images[0]} alt="post" className={styles.postImage} />
                                    ) : (
                                        <div className={styles.noImage}>
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.detailsContainer}>
                                    <div className={styles.cardHeader}>
                                        <p className={styles.sellerName}><strong>ผู้ขาย:</strong> {job.seller_name || "ไม่ระบุชื่อ"}</p>
                                        <span className={styles.statusBadge}>นัดหมายแล้ว</span>
                                    </div>
                                    <div className={styles.timeHighlight}>
                                        {(() => {
                                            const pt = parsePickupTime(job.pickup_time);
                                            return (
                                                <>
                                                    <p style={{ margin: 0 }}><strong>วันที่:</strong> {pt?.date || "รอระบุ"}</p>
                                                    <p style={{ margin: 0 }}><strong>เวลา:</strong> {pt ? `${pt.startTime} - ${pt.endTime}` : "รอระบุ"}</p>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            <button
                                className={styles.navBtn}
                                onClick={() => window.location.href = `/contact/${job.id}`}
                            >
                                ดูเส้นทาง/เริ่มงาน
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ConfirmedWork;