import { useState } from "react";
import { db } from "../../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import "./SlipVerification.css";

interface SlipVerificationProps {
  paymentId: string;
  amount: number;
  packageName: string;
  onVerificationComplete?: () => void;
}

interface SlipResponse {
  success: boolean;
  data?: {
    transRef: string;
    transDate: string;
    transTime: string;
    sendingBank: string;
    sendingBankCode: string;
    receivingBank: string;
    receivingBankCode: string;
    senderName: string;
    receiverName: string;
    transAmount: number;
    ref1: string;
    ref2: string;
    ref3: string;
  };
  message?: string;
}

export default function SlipVerification({
  paymentId,
  amount,
  packageName,
  onVerificationComplete,
}: SlipVerificationProps) {
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [verificationResult, setVerificationResult] = useState<SlipResponse | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("โปรดอัปโหลดไฟล์รูปภาพเท่านั้น");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("ขนาดไฟล์ต้องน้อยกว่า 5MB");
      return;
    }

    setSlipFile(file);
    setError("");

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVerifySlip = async () => {
    if (!slipFile) {
      setError("โปรดเลือกไฟล์สลิปก่อน");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];

        // Call EasySlip API
        const response = await fetch("https://api.easyslip.com/api/v1/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Replace with your EasySlip API key
            Authorization: `Bearer YOUR_EASYSLIP_API_KEY`,
          },
          body: JSON.stringify({
            files: [base64],
          }),
        });

        const data: SlipResponse = await response.json();

        if (data.success && data.data) {
          // Verify amount matches
          if (Math.abs(data.data.transAmount - amount) > 0.01) {
            setError(`จำนวนเงินไม่ตรงกัน ระบบต้องการ ${amount} บาท แต่สลิปแสดง ${data.data.transAmount} บาท`);
            setVerifying(false);
            return;
          }

          setVerificationResult(data);
          setSuccess(true);

          // Update payment record in Firestore
          if (paymentId) {
            await updateDoc(doc(db, "payments", paymentId), {
              status: "verified",
              slipVerified: true,
              slipData: {
                transRef: data.data.transRef,
                transDate: data.data.transDate,
                transTime: data.data.transTime,
                sendingBank: data.data.sendingBank,
                receiverName: data.data.receiverName,
                transAmount: data.data.transAmount,
              },
              verifiedAt: serverTimestamp(),
            });
          }

          // Call completion callback after delay
          setTimeout(() => {
            onVerificationComplete?.();
          }, 2000);
        } else {
          setError(data.message || "ไม่สามารถตรวจสอบสลิปได้ โปรดลองใหม่");
        }

        setVerifying(false);
      };
      reader.readAsDataURL(slipFile);
    } catch (err) {
      console.error("Error verifying slip:", err);
      setError("เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาลองใหม่");
      setVerifying(false);
    }
  };

  if (success && verificationResult) {
    return (
      <div className="slip-verification">
        <div className="verification-success">
          <div className="success-icon">✓</div>
          <h3>ยืนยันสลิปสำเร็จ</h3>
          <div className="verification-details">
            <div className="detail-row">
              <span className="label">วันที่/เวลา:</span>
              <span className="value">
                {verificationResult.data?.transDate} {verificationResult.data?.transTime}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">จำนวนเงิน:</span>
              <span className="value">{verificationResult.data?.transAmount} บาท</span>
            </div>
            <div className="detail-row">
              <span className="label">ชื่อผู้รับ:</span>
              <span className="value">{verificationResult.data?.receiverName}</span>
            </div>
            <div className="detail-row">
              <span className="label">อ้างอิง:</span>
              <span className="value">{verificationResult.data?.transRef}</span>
            </div>
            <div className="detail-row">
              <span className="label">แพ็คเกจ:</span>
              <span className="value">{packageName}</span>
            </div>
          </div>
          <p className="redirect-msg">กำลังเปลี่ยนเพจ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="slip-verification">
      <div className="slip-container">
        <h2>ยืนยันการชำระเงินด้วยสลิป</h2>

        <div className="payment-info">
          <h3>รายละเอียดการชำระเงิน</h3>
          <div className="info-item">
            <span className="label">แพ็คเกจ:</span>
            <span className="value">{packageName}</span>
          </div>
          <div className="info-item">
            <span className="label">จำนวนเงิน:</span>
            <span className="value amount">{amount.toFixed(2)} บาท</span>
          </div>
        </div>

        <div className="upload-section">
          <h3>อัปโหลดสลิปการโอนเงิน</h3>
          <p className="instruction">
            กรุณาอัปโหลดรูปภาพสลิปการโอนเงิน ระบบจะตรวจสอบอัตโนมัติ
          </p>

          <div className="upload-area">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={verifying}
              className="file-input"
              id="slip-file"
            />
            <label htmlFor="slip-file" className="upload-label">
              <div className="upload-icon">📷</div>
              <p>คลิกหรือลากไฟล์มาที่นี่</p>
              <small>รองรับไฟล์: JPG, PNG (สูงสุด 5MB)</small>
            </label>
          </div>

          {preview && (
            <div className="preview-section">
              <h4>ตัวอย่าง:</h4>
              <img src={preview} alt="Slip preview" className="slip-preview" />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button
            className="btn-verify"
            onClick={handleVerifySlip}
            disabled={!slipFile || verifying}
          >
            {verifying ? "กำลังตรวจสอบ..." : "ตรวจสอบสลิป"}
          </button>
        </div>

        <div className="help-section">
          <h4>💡 ข้อมูลช่วยเหลือ</h4>
          <ul>
            <li>ถ่ายรูปสลิปให้ชัดเจน โดยเห็นข้อมูลการโอนเงินทั้งหมด</li>
            <li>จำนวนเงินในสลิปต้องตรงกับจำนวนที่ระบบต้องการ</li>
            <li>ชื่อผู้รับต้องตรงกับชื่อบัญชีที่ลงทะเบียน</li>
            <li>ระบบใช้เวลาประมาณ 1-2 วินาทีในการตรวจสอบ</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
