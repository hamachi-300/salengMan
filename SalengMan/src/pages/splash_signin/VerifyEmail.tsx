import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState("กำลังยืนยัน...");
    const navigate = useNavigate();
    const token = searchParams.get("token");

    useEffect(() => {
        const verify = async () => {
            try {
                // Using the base URL from the environment or default
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const response = await fetch(`${baseUrl}/auth/verify-email?token=${token}`);
                const data = await response.json();

                if (response.ok) {
                    setStatus("ยืนยันสำเร็จ! กำลังพากลับหน้า Login...");
                    setTimeout(() => navigate("/login"), 3000);
                } else {
                    setStatus(data.error || data.message || "การยืนยันล้มเหลว");
                }
            } catch (err) {
                console.error("Verification error:", err);
                setStatus("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
            }
        };

        if (token) {
            verify();
        } else {
            setStatus("ไม่พบโทเคนสำหรับการยืนยัน");
        }
    }, [token, navigate]);

    return (
        <div style={{
            textAlign: "center",
            marginTop: "100px",
            fontFamily: "Arial, sans-serif",
            padding: "20px"
        }}>
            <h1 style={{ color: "#333" }}>{status}</h1>
            <p style={{ color: "#666", marginTop: "20px" }}>กรุณารอสักครู่...</p>
        </div>
    );
}

export default VerifyEmail;
