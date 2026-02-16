import { useNavigate } from "react-router-dom";
import styles from "./TrashMainPage.module.css";
import BottomNav from "../../components/BottomNav";

function TrashMainPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate("/home")}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <h1 className={styles.title}>Dispose Trash</h1>
          <div style={{ width: "40px" }}></div>
        </div>

        {/* Main Content */}
        <div className={styles.mainContent}>
          <div className={styles.banner}>
            <h2 className={styles.bannerTitle}>Trash Disposal Service</h2>
            <p className={styles.bannerText}>
              อย่างรับการรีไซเคิลขยะของคุณและรับเหรียญรางวัล
            </p>
          </div>

          {/* Services Grid */}
          <div className={styles.servicesGrid}>
            <div className={styles.serviceCard} onClick={() => navigate("/trash/post")}>
              <div className={styles.serviceIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                </svg>
              </div>
              <h3 className={styles.serviceTitle}>Schedule Pickup</h3>
              <p className={styles.serviceDescription}>จองการเก็บขยะ</p>
            </div>

            <div className={styles.serviceCard} onClick={() => navigate("/coin")}>
              <div className={styles.serviceIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v12M6 12h12" />
                </svg>
              </div>
              <h3 className={styles.serviceTitle}>View Coins</h3>
              <p className={styles.serviceDescription}>ดูเหรียญของคุณ</p>
            </div>
          </div>

          {/* Info Section */}
          <div className={styles.infoSection}>
            <h3 className={styles.infoTitle}>How It Works</h3>
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <div className={styles.stepNumber}>1</div>
                <p>Schedule a pickup date and time</p>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.stepNumber}>2</div>
                <p>Prepare your trash items</p>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.stepNumber}>3</div>
                <p>We collect and recycle them</p>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.stepNumber}>4</div>
                <p>Earn coins for disposal</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default TrashMainPage;
