import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Splash.module.css";
import reactLogo from "../../assets/icon/logo.svg";

function Splash() {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2500);

    const navTimer = setTimeout(() => {
      navigate("/signin");
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div className={`${styles.splash} ${fadeOut ? styles.fadeOut : ""}`}>
      <div className={styles.splashContent}>
        <img src={reactLogo} alt="Logo" className={styles.logo} />
        <h1 className={styles.splashTitle}>Saleng<span className={styles.ex}>Man</span></h1>
        <h1 className={styles.splashSubtitle}>Driver</h1>
        <h1 className={styles.splashText}>รับซื้อของเก่าได้ง่ายๆ</h1>
      </div>
    </div>
  );
}

export default Splash;
