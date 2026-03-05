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
                const response = await fetch(`http://localhost:3000/api/auth/verify-email?token=${token}`);
                const data = await response.json();
                if (response.ok) {
                    setStatus("ยืนยันสำเร็จ! กำลังพากลับหน้า Login...");
                    setTimeout(() => navigate("/login"), 3000);
                } else {
                    setStatus(data.message);
                }
            } catch (err) {
                setStatus("เกิดข้อผิดพลาดในการเชื่อมต่อ");
            }
        };
        if (token) verify();
    }, [token, navigate]);

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>{status}</h1>
        </div>
    );
}

export default VerifyEmail;
