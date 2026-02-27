import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import styles from "./ConfirmJob.module.css";

const API_URL = import.meta.env.VITE_API_URL;

function ConfirmJob() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      // 1. ตรวจสอบชื่อ Token ให้ตรงกับระบบ Authentication ของโปรเจกต์
      const token = localStorage.getItem("auth_token"); 

      const res = await fetch(`${API_URL}/contacts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      console.log("DEBUG - Response from Backend:", data); // ตรวจสอบข้อมูลใน Console (F12)

      if (!Array.isArray(data)) {
        setContacts([]);
        return;
      }

      // 2. กรองเฉพาะงานที่มีสถานะเป็น pending เพื่อให้คนขับยืนยันรับงาน
      const filtered = data.filter(
        (c: any) => c.status && c.status.toLowerCase() === "pending"
      );
      
      setContacts(filtered);
    } catch (err) {
      console.error("FETCH CONTACT ERROR:", err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedId) return;

    try {
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_URL}/contacts/${selectedId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "confirmed" }),
      });

      if (res.ok) {
        alert("ยืนยันรับงานสำเร็จ! กำลังไปที่หน้าตารางงาน");
        navigate("/driver/time-slot"); // ไปหน้าตารางงานหลังยืนยัน
      } else {
        alert("ไม่สามารถยืนยันงานได้ โปรดลองอีกครั้ง");
      }
    } catch (err) {
      console.error("CONFIRM ERROR:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>เลือกงานที่ต้องการยืนยัน</h1>

      {loading && <p className={styles.message}>กำลังโหลดข้อมูลงาน...</p>}

      {!loading && contacts.length === 0 && (
        <div className={styles.emptyState}>
          <p>ยังไม่มีงานที่คนขายเลือกคุณ</p>
          <small>(โปรดเช็กว่าฝั่งคนขายกดยืนยันเลือกคุณในระบบแล้ว)</small>
        </div>
      )}

      {contacts.map((c) => (
        <div
          key={c.id}
          className={`${styles.card} ${
            selectedId === c.id ? styles.selected : ""
          }`}
          onClick={() => setSelectedId(c.id)}
        >
          <div className={styles.name}>
            {/* แสดงชื่อผู้ขาย หรือใช้ ID ในกรณีที่ข้อมูลชื่อไม่ถูกส่งมา */}
            ร้านค้า: {c.seller_name || `รหัสผู้ขาย: ${c.seller_id?.substring(0, 8)}...`}
          </div>

          <div className={styles.detail}>
            รหัสประกาศ: #{c.post_id} <br/>
            สถานะปัจจุบัน: <span style={{color: '#ff7a2f', fontWeight: 'bold'}}>{c.status}</span>
          </div>
        </div>
      ))}

      <button
        className={styles.confirmBtn}
        onClick={handleConfirm}
        disabled={!selectedId || loading}
      >
        {loading ? "กำลังบันทึก..." : "ยืนยันรับงาน"}
      </button>
    </div>
  );
}

export default ConfirmJob;