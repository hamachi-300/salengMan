import { useState, useEffect } from "react";
import "./Token.css";
import { useNavigate, useLocation } from "react-router-dom";

function Token() {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = location.state?.tokens ?? 0;
  const [tokens, setTokens] = useState<number>(initial);
  const [hasMonthlyPacket, setHasMonthlyPacket] = useState<boolean>(false);

  useEffect(() => {
    // if navigated in with tokens in state, initialize
    if (location.state?.tokens !== undefined) {
      setTokens(location.state.tokens);
    }
  }, [location.state]);

  const mainPackets = [
    { id: "standard", label: "Standard (Monthly)", tokens: 10, price: 300 },
    { id: "premium", label: "Premium (Monthly)", tokens: 20, price: 590 },
    { id: "once", label: "Once/Everyday (Monthly)", tokens: 30, price: 880 },
    { id: "twice", label: "Twice/Everyday (Monthly)", tokens: 60, price: 1760 },
  ];

  const singlePacket = { tokens: 1, price: 49 };

  const supplementary = [
    { id: "s3", tokens: 3, price: 139 },
    { id: "s5", tokens: 5, price: 215 },
  ];

  function buyMain(p: { tokens: number; price: number }) {
    setTokens((s) => s + p.tokens);
    setHasMonthlyPacket(true);
  }

  function buySingle() {
    setTokens((s) => s + singlePacket.tokens);
  }

  function buySupplement(p: { tokens: number; price: number }) {
    if (!hasMonthlyPacket) return;
    setTokens((s) => s + p.tokens);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button
          className="back-btn"
          onClick={() => navigate("/home", { state: { tokens } })}
          title="กลับ"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
      </div>

      <div className="token-content">
        <h1 className="token-title">My Tokens</h1>

        <div className="token-display">
          <div className="token-square">
            <span className="token-count">{tokens}</span>
            <span className="token-label">Tokens</span>
          </div>
        </div>

        <div className="packet-section">
          <h2 className="section-title">ข้อกำหนด</h2>
          <p className="section-subtitle">ทุกแพ็คเกจ จำกัดถุงขยะขนาดใหญ่ จำนวน 3 ถุงต่อโทเคน</p>
        </div>

        <div className="packet-section">
          <h2 className="section-title">แพ็คเกจรายเดือน (Main Packets)</h2>
          <p className="section-subtitle">เลือกหนึ่งในแพ็คเกจรายเดือนด้านล่าง</p>
          <div className="packet-grid">
            {mainPackets.map((p) => (
              <div key={p.id} className={`packet-card ${p.id === "premium" ? "featured" : ""}`}>
                {p.id === "premium" && <div className="packet-badge">Popular</div>}
                <div className="packet-info">
                  <h3>{p.label}</h3>
                  <p>{p.tokens} token / month — {p.price} บาท</p>
                </div>
                <button className="buy-btn dark-btn" onClick={() => buyMain(p)}>
                  ซื้อ
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="packet-section">
          <h2 className="section-title">แพ็คเกจหลัก (รายครั้ง)</h2>
          <p className="section-subtitle">ซื้อครั้งเดียว</p>
          <div className="packet-grid">
            <div className="packet-card">
              <div className="packet-info">
                <h3>Single Token</h3>
                <p>1 token — {singlePacket.price} บาท</p>
              </div>
              <button className="buy-btn orange-btn" onClick={buySingle}>
                ซื้อ
              </button>
            </div>
          </div>
        </div>

        <div className="packet-section">
          <h2 className="section-title">แพ็คเกจเสริม (สำหรับคนซื้อรายเดือนเท่านั้น)</h2>
          <p className="section-subtitle">ซื้อเพิ่มเฉพาะลูกค้าที่มีแพ็คเกจรายเดือน</p>
          <div className="packet-grid">
            {supplementary.map((s) => (
              <div key={s.id} className={`packet-card ${!hasMonthlyPacket ? "disabled" : ""}`}>
                <div className="packet-info">
                  <h3>{s.tokens} token</h3>
                  <p>{s.price} บาท</p>
                </div>
                <button className="buy-btn orange-btn" onClick={() => buySupplement(s)} disabled={!hasMonthlyPacket}>
                  ซื้อ
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Token;
