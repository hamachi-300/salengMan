import { useState } from "react";
import "./Token.css";
import { useNavigate } from "react-router-dom";

function Token() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState(0);
  const [hasMonthlyPacket, setHasMonthlyPacket] = useState(false);

  const handleBuyMainPacket = (type: "daily" | "monthly") => {
    if (type === "daily") {
      setTokens((prev) => prev + 5);
    } else {
      setTokens((prev) => prev + 30);
      setHasMonthlyPacket(true);
    }
  };

  const handleBuySupplementary = (amount: number) => {
    if (hasMonthlyPacket) {
      setTokens((prev) => prev + amount);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/home")}>
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
          <h2 className="section-title">Main Packets</h2>
          <p className="section-subtitle">Available for everyone</p>

          <div className="packet-grid">
            <div className="packet-card">
              <div className="packet-info">
                <h3>Daily Packet</h3>
                <p>5 tokens</p>
              </div>
              <button
                className="buy-btn orange-btn"
                onClick={() => handleBuyMainPacket("daily")}
              >
                Buy - 29 THB
              </button>
            </div>

            <div className="packet-card featured">
              <div className="packet-badge">Best Value</div>
              <div className="packet-info">
                <h3>Monthly Packet</h3>
                <p>30 tokens</p>
              </div>
              <button
                className="buy-btn dark-btn"
                onClick={() => handleBuyMainPacket("monthly")}
              >
                Buy - 199 THB
              </button>
            </div>
          </div>
        </div>

        <div className="packet-section">
          <h2 className="section-title">Supplementary Packets</h2>
          <p className="section-subtitle">
            {hasMonthlyPacket
              ? "Add more tokens to your monthly plan"
              : "Purchase a monthly packet to unlock"}
          </p>

          <div className="packet-grid">
            <div className={`packet-card ${!hasMonthlyPacket ? "disabled" : ""}`}>
              <div className="packet-info">
                <h3>Small Add-on</h3>
                <p>10 tokens</p>
              </div>
              <button
                className="buy-btn orange-btn"
                onClick={() => handleBuySupplementary(10)}
                disabled={!hasMonthlyPacket}
              >
                Buy - 59 THB
              </button>
            </div>

            <div className={`packet-card ${!hasMonthlyPacket ? "disabled" : ""}`}>
              <div className="packet-info">
                <h3>Large Add-on</h3>
                <p>25 tokens</p>
              </div>
              <button
                className="buy-btn orange-btn"
                onClick={() => handleBuySupplementary(25)}
                disabled={!hasMonthlyPacket}
              >
                Buy - 129 THB
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Token;
