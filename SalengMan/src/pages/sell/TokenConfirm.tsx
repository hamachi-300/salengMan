import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TokenConfirm.css";

function TokenConfirm() {
    const navigate = useNavigate();
    const [bagCount, setBagCount] = useState(1);
    const [userToken, setUserToken] = useState(3); // Mock token count

    const handleIncrement = () => setBagCount(prev => prev + 1);
    const handleDecrement = () => setBagCount(prev => (prev > 1 ? prev - 1 : 1));

    return (
        <div className="page-container token-confirm-page">
            <div className="token-header-row">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                    </svg>
                </button>
                <div className="token-badge">
                    Token: <span className="token-value">{userToken}</span>
                    <button className="add-token-mini-btn">+</button>
                </div>
            </div>

            <h1 className="page-title-center">ระบุจำนวนถุง</h1>

            <div className="counter-card">
                <div className="counter-row">
                    <button className="counter-btn minus" onClick={handleDecrement}>−</button>
                    <div className="counter-value">{bagCount}</div>
                    <button className="counter-btn plus" onClick={handleIncrement}>+</button>
                </div>
                <p className="counter-label">จำนวนถุงที่ต้องการลงขาย</p>
            </div>

            <div className="bottom-actions-column">
                <button className="action-btn-outline" onClick={() => console.log("Top up token")}>
                    <span className="coin-icon">$</span> เติม Token
                </button>
                <button className="action-btn-primary" onClick={() => navigate("/history")}>
                    เสร็จสิ้น <span className="check-icon">✓</span>
                </button>
            </div>
        </div>
    );
}

export default TokenConfirm;
