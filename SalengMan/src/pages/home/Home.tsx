import "./Home.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tokens, setTokens] = useState(0);

  useEffect(() => {
    // Update tokens from location state when returning from token page
    if (location.state?.tokens !== undefined) {
      setTokens(location.state.tokens);
    }
  }, [location.state]);

  return (
    <div className="home">
      <div className="home-content">
        {/* Header */}
        <div className="home-header">
          <div className="welcome-text">
            <p className="welcome-label">Welcome back,</p>
            <h1 className="welcome-name">Saleng Man</h1>
          </div>
          <div className="header-right">
            <div className="token-display">
              <span className="token-label">Token:</span>
              <div className="token-box">{tokens}</div>
              <button className="token-buy-btn" onClick={() => navigate("/token", { state: { tokens } })} title="Buy Token">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            <div className="profile-avatar">
              <div className="avatar-placeholder"></div>
            </div>
          </div>
        </div>

        {/* Banner Card */}
        <div className="banner-card">
          <div className="banner-content">
            <h2 className="banner-title">Green World</h2>
            <p className="banner-text">
              Turn your trash into treasure and save the planet.
            </p>
          </div>
          <div className="banner-decoration"></div>
        </div>

        {/* Services Section */}
        <div className="services-section">
          <h2 className="section-title">Services</h2>
          <div className="services-grid">
            <div className="service-card" onClick={() => navigate("/sell")}>
              <div className="service-icon-wrapper">
                <svg className="service-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                </svg>
              </div>
              <h3 className="service-title">Sell Old Items</h3>
              <p className="service-subtitle">ขายของเก่า</p>
            </div>
            <div className="service-card" onClick={() => navigate("/dispose")}>
              <div className="service-icon-wrapper">
                <svg className="service-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                </svg>
              </div>
              <h3 className="service-title">Dispose Trash</h3>
              <p className="service-subtitle">ทิ้งขยะ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="nav-item active">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="nav-label">Home</span>
        </div>
        <div className="nav-item" onClick={() => navigate("/history")}>
          <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 14h-2v-4H9V9h4V5h2v4h4v4h-4v4z" />
          </svg>
          <span className="nav-label">History</span>
        </div>
        <div className="nav-item" onClick={() => navigate("/notify")}>
          <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
          <span className="nav-label">Notify</span>
        </div>
        <div className="nav-item" onClick={() => navigate("/account")}>
          <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span className="nav-label">Account</span>
        </div>
      </nav>
    </div>
  );
}

export default Home;
