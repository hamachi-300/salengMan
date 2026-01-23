import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Splash.css";
import reactLogo from "../assets/icon/logo.svg";

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
    <div className={`splash ${fadeOut ? "fade-out" : ""}`}>
      <div className="splash-content">
        <img src={reactLogo} alt="Logo" className="logo" />
        <h1 className="splash-title">Saleng<span className="ex">Man</span></h1>
        <h1 className="splash-text">ขายและทิ้งขยะได้ง่ายๆ</h1>
      </div>
    </div>
  );
}

export default Splash;
