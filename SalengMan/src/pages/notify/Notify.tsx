import "../sell/Sell.css";
import { useNavigate } from "react-router-dom";

function Notify() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/home")}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className="page-title">Notifications</h1>
      </div>
      <div className="page-content">
        <p className="placeholder-text">Coming soon...</p>
      </div>
    </div>
  );
}

export default Notify;
