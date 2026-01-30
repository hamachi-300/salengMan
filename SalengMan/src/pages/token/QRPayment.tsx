import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import QRCode from "qrcode";
import PromptPayQR from "promptpay-qr";
import "./QRPayment.css";
import { auth, db } from "../../firebase";
import { addDoc, collection, serverTimestamp, doc, updateDoc, Timestamp } from "firebase/firestore";

interface PaymentData {
  amount: number;
  tokens: number;
  packageName: string;
}

interface QRPaymentProps {
  paymentData?: PaymentData;
  onPaymentComplete?: (paymentId: string) => void;
}

function QRPayment({ paymentData: propPaymentData, onPaymentComplete }: QRPaymentProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const paymentData = propPaymentData || (location.state as PaymentData);

  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState<number>(600); // 10 minutes in seconds
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // PromptPay mobile number (format: xxx-xxx-xxxxx)
  // Replace this with your actual PromptPay phone number
  const PROMPTPAY_PHONE = "095-841-8410"; // Replace with your phone number

  useEffect(() => {
    if (!paymentData) {
      setError("ไม่พบข้อมูลการชำระเงิน");
      setLoading(false);
      return;
    }

    generateQRCode();
  }, [paymentData]);

  // Timer effect for QR code expiration
  useEffect(() => {
    if (isExpired || !qrCodeUrl) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          setError("QR Code หมดอายุแล้ว กรุณากดสร้าง QR Code ใหม่");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExpired, qrCodeUrl]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setError("");
      setTimeRemaining(600); // Reset to 10 minutes
      setIsExpired(false);

      // Generate PromptPay payload using phone number
      const payload = PromptPayQR(PROMPTPAY_PHONE, {
        amount: paymentData.amount,
      });

      // Generate QR code as data URL
      const qrUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrCodeUrl(qrUrl);

      // create a payment record in Firestore (pending)
      try {
        const docRef = await addDoc(collection(db, "payments"), {
          userId: auth.currentUser?.uid ?? null,
          amount: paymentData.amount,
          tokens: paymentData.tokens,
          packageName: paymentData.packageName,
          status: "pending",
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)),
        });
        setPaymentId(docRef.id);
      } catch (e) {
        console.error("Failed to create payment record:", e);
      }
    } catch (err) {
      console.error("Error generating QR code:", err);
      setError("เกิดข้อผิดพลาดในการสร้าง QR Code");
    } finally {
      setLoading(false);
    }
  };


  const handlePaymentComplete = () => {
    // If callback is provided (from PaymentFlow), call it with paymentId
    if (onPaymentComplete && paymentId) {
      onPaymentComplete(paymentId);
      return;
    }

    // Otherwise, navigate back directly (standalone mode)
    (async () => {
      if (paymentId) {
        try {
          await updateDoc(doc(db, "payments", paymentId), {
            status: "completed",
            verifiedAt: serverTimestamp(),
          });
        } catch (e) {
          console.error("Failed to update payment status:", e);
        }
      }
      navigate("/token", {
        state: { paymentSuccess: true, amount: paymentData.amount },
      });
    })();
  };

  const handleCancel = () => {
    if (propPaymentData) {
      // If using as component in PaymentFlow, just clear state
      return;
    }
    navigate("/token");
  };

  if (!paymentData) {
    return (
      <div className="page-container">
        <div className="error-container">
          <p>ไม่พบข้อมูลการชำระเงิน</p>
          <button onClick={handleCancel}>กลับ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={handleCancel} title="กลับ">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className="page-title">ชำระเงินผ่าน PromptPay</h1>
      </div>

      <div className="payment-content">
        {/* Payment Details */}
        <div className="payment-details">
          <h2>รายละเอียดการชำระเงิน</h2>
          <div className="detail-item">
            <span className="detail-label">สินค้า:</span>
            <span className="detail-value">{paymentData.packageName}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">จำนวน Token:</span>
            <span className="detail-value">{paymentData.tokens} tokens</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">ราคา:</span>
            <span className="detail-value detail-amount">
              {paymentData.amount.toFixed(2)} บาท
            </span>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="qr-section">
          {loading ? (
            <div className="loading">
              <p>กำลังสร้าง QR Code...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={generateQRCode}>สร้าง QR Code ใหม่</button>
            </div>
          ) : (
            <>
              <div className="qr-timer">
                <span className={`timer-text ${timeRemaining < 60 ? "warning" : ""}`}>
                  ⏱️ เหลือเวลา: {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, "0")} นาที
                </span>
              </div>

              <div className="qr-container">
                <img 
                  src={qrCodeUrl} 
                  alt="PromptPay QR Code" 
                  className={`qr-code ${isExpired ? "expired" : ""}`}
                  style={{ opacity: isExpired ? 0.5 : 1 }}
                />
              </div>

              {!isExpired && (
                <div className="instruction">
                  <h3>วิธีการชำระเงิน</h3>
                  <ol>
                    <li>เปิดแอปพลิเคชันธนาคารของคุณ (Mobile Banking)</li>
                    <li>เลือกการสแกน QR Code</li>
                    <li>สแกน QR Code ด้านบน</li>
                    <li>ตรวจสอบจำนวนเงินและยืนยันการชำระเงิน</li>
                    <li>การชำระเงินจะเสร็จสิ้นโดยอัตโนมัติ</li>
                  </ol>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="button-group">
          <button className="btn btn-primary" onClick={handlePaymentComplete} disabled={isExpired}>
            ชำระเงินแล้ว
          </button>
          <button className="btn btn-secondary" onClick={handleCancel}>
            ยกเลิก
          </button>
        </div>

        {/* Note */}
        <div className="note">
          <p>
            💡 <strong>หมายเหตุ:</strong> QR Code นี้จะใช้ได้เพียงครั้งเดียว
            หากการชำระเงินไม่สำเร็จ
            กรุณากลับมาและสร้าง QR Code ใหม่
          </p>
        </div>
      </div>
    </div>
  );
}

export default QRPayment;
