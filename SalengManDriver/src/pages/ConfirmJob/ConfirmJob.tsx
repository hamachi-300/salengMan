import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AlertPopup from "../../components/AlertPopup";
import ConfirmPopup from "../../components/ConfirmPopup";
import PageFooter from "../../components/PageFooter";
import PageHeader from "../../components/PageHeader";
import SuccessPopup from "../../components/SuccessPopup";
import { useUser } from "../../context/UserContext";
import styles from "./ConfirmJob.module.css";

const API_URL = import.meta.env.VITE_API_URL;

const getPostTypeLabel = (categories: string[]) => {
    if (categories && categories.includes('trash') || categories?.some(c => c.toLowerCase().includes('ขยะ'))) {
        return 'รับทิ้งขยะ';
    }
    return 'รับซื้อของเก่า';
};

const formatHistoryDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const now = new Date();
    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    const isYesterday =
        date.getDate() === now.getDate() - 1 &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;

    return `${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    })}, ${timeStr}`;
};

function ConfirmJob() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [contacts, setContacts] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [showConfirmPopup, setShowConfirmPopup] = useState(false);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    const toggleSelection = (contactId: number) => {
        setSelectedIds((prev) =>
            prev.includes(contactId)
                ? prev.filter((id) => id !== contactId)
                : [...prev, contactId]
        );
    };

    // ✅ ยิง fetch แน่นอนเมื่อ user.id พร้อม
    useEffect(() => {
        if (!user?.id) return;
        fetchContacts();
    }, [user?.id]);

    const fetchContacts = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem("auth_token");
            if (!token) {
                alert("No token found");
                return;
            }

            console.log("Fetching contacts from", `${API_URL}/contacts`);
            const res = await fetch(`${API_URL}/contacts`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const errorText = await res.text();
                alert(`API Error: ${res.status} ${errorText}`);
                console.error("API Error:", res.status, errorText);
                return;
            }

            const data = await res.json();
            console.log("Fetched contacts data:", data);

            // filter งานของ driver คนนี้ + pending
            const filtered = data.filter(
                (c: any) =>
                    c.buyer_id === user?.id &&
                    c.status?.toLowerCase() === "pending"
            );

            console.log("Filtered contacts:", filtered, "for user:", user?.id);

            setContacts(filtered);
        } catch (err) {
            alert(`Fetch exception: ${err}`);
            console.error("FETCH ERROR:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (selectedIds.length === 0) return;
        setShowConfirmPopup(true);
    };

    const executeConfirm = async () => {
        try {
            setShowConfirmPopup(false);
            setLoading(true);

            const token = localStorage.getItem("auth_token");
            if (!token) {
                setAlertMessage("No token found");
                return;
            }

            await Promise.all(
                selectedIds.map((id) =>
                    fetch(`${API_URL}/contacts/${id}/status`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ status: "confirmed" }),
                    })
                )
            );

            setShowSuccessPopup(true);
        } catch (err) {
            console.error("CONFIRM ERROR:", err);
            setAlertMessage("เกิดข้อผิดพลาดในการยืนยันรับงาน");
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessConfirm = () => {
        setShowSuccessPopup(false);
        setSelectedIds([]);
        navigate("/confirmed-work");
    };

    return (
        <div className={styles["page-container"]}>
            <PageHeader title="งานที่รอยืนยัน" backTo="/history" />

            <div className={styles.content}>
                {loading ? (
                    <p className={styles.loading}>กำลังโหลด...</p>
                ) : contacts.length === 0 ? (
                    <p className={styles["empty-state"]}>ไม่มีงานที่รอคุณยืนยัน</p>
                ) : (
                    contacts.map((c) => (
                        <div
                            key={c.id}
                            className={`${styles.card} ${selectedIds.includes(c.id) ? styles.selected : ""}`}
                            onClick={() => toggleSelection(c.id)}
                        >
                            <div className={styles["image-container"]}>
                                {c.images && c.images.length > 0 ? (
                                    <img src={c.images[0]} alt="post" className={styles["post-image"]} />
                                ) : (
                                    <div className={styles["no-image"]}>
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className={styles["card-content"]}>
                                <div className={styles["card-header"]}>
                                    <div className={styles["title-with-dot"]}>
                                        <h3 className={styles["post-title"]}>
                                            {getPostTypeLabel(c.categories || [])}
                                        </h3>
                                        <div className={styles.dot}></div>
                                    </div>
                                    <div className={`${styles["status-badge"]} ${selectedIds.includes(c.id) ? styles["status-selected"] : styles["status-pending"]}`}>
                                        {selectedIds.includes(c.id) ? "Selected" : "Pending"}
                                    </div>
                                </div>
                                <div className={styles["post-time"]}>
                                    {formatHistoryDate(c.created_at)}
                                </div>
                                <div className={styles["tags-container"]}>
                                    {c.categories && c.categories.length > 0 ? (
                                        c.categories
                                            .filter((cat: string) => !cat.includes('อื่น'))
                                            .slice(0, 1)
                                            .map((cat: string, index: number) => (
                                                <span key={index} className={styles["category-tag"]}>
                                                    {cat.length > 10 ? cat.slice(0, 10) + '...' : cat}
                                                </span>
                                            ))
                                    ) : (
                                        <span className={styles["category-tag"]}>ไม่ระบุหมวดหมู่</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <PageFooter
                title={`ยืนยันรับงาน (${selectedIds.length})`}
                onClick={handleConfirm}
                disabled={selectedIds.length === 0 || loading}
                showArrow={false}
            />

            <ConfirmPopup
                isOpen={showConfirmPopup}
                title="ยืนยันการรับงาน"
                message={`คุณต้องการยืนยันรับงานจำนวน ${selectedIds.length} งาน ใช่หรือไม่?`}
                onConfirm={executeConfirm}
                onCancel={() => setShowConfirmPopup(false)}
                confirmText="ตกลง"
                cancelText="ยกเลิก"
                confirmColor="#4CAF50"
            />

            <SuccessPopup
                isOpen={showSuccessPopup}
                title="รับงานสำเร็จ!"
                message={`คุณได้รับงานจำนวน ${selectedIds.length} งาน เรียบร้อยแล้ว`}
                onConfirm={handleSuccessConfirm}
                confirmText="ตกลง (OK)"
            />

            <AlertPopup
                isOpen={alertMessage !== null}
                title="ผิดพลาด"
                message={alertMessage || ""}
                onClose={() => setAlertMessage(null)}
            />
        </div>
    );
}

export default ConfirmJob;
