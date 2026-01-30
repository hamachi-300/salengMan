import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import QRPayment from "./QRPayment";
import SlipVerification from "./SlipVerification";
import "./PaymentFlow.css";

interface PaymentData {
  amount: number;
  tokens: number;
  packageName: string;
}

export default function PaymentFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const paymentData = location.state as PaymentData;
  const [step, setStep] = useState<"qr" | "slip">("qr"); // qr or slip
  const [paymentId, setPaymentId] = useState<string | null>(null);

  if (!paymentData) {
    return (
      <div className="page-container">
        <div className="error-container">
          <p>ไม่พบข้อมูลการชำระเงิน</p>
          <button onClick={() => navigate("/token")}>กลับ</button>
        </div>
      </div>
    );
  }

  const handleQRPaymentComplete = (id: string) => {
    setPaymentId(id);
    setStep("slip");
  };

  const handleSlipVerificationComplete = () => {
    navigate("/token", {
      state: { paymentSuccess: true, amount: paymentData.amount },
    });
  };

  return (
    <div className="payment-flow-container">
      {/* Progress indicator */}
      <div className="progress-bar">
        <div className={`progress-step ${step === "qr" ? "active" : step === "slip" ? "completed" : ""}`}>
          <div className="step-number">1</div>
          <div className="step-label">สแกน QR Code</div>
        </div>
        <div className="progress-line"></div>
        <div className={`progress-step ${step === "slip" ? "active" : ""}`}>
          <div className="step-number">2</div>
          <div className="step-label">ยืนยันสลิป</div>
        </div>
      </div>

      {/* Step content */}
      <div className="step-content">
        {step === "qr" ? (
          <QRPayment paymentData={paymentData} onPaymentComplete={handleQRPaymentComplete} />
        ) : (
          <SlipVerification
            paymentId={paymentId || ""}
            amount={paymentData.amount}
            packageName={paymentData.packageName}
            onVerificationComplete={handleSlipVerificationComplete}
          />
        )}
      </div>
    </div>
  );
}
