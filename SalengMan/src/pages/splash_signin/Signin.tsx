import styles from "./Signin.module.css";
import reactLogo from "../../assets/icon/logo.svg";
import { useNavigate } from "react-router-dom";

function SignIn() {
  const navigate = useNavigate();

  return (
    <div className={styles.signin}>
      <div className={styles.signinContent}>
        <h1 className={styles.signinTitle}>Sign In</h1>
        <img src={reactLogo} alt="Logo" className={styles.logo} />
        <div className={styles.buttonDiv}>
          <button
            className={`${styles.signinBtn} ${styles.darkBtn}`}
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            className={`${styles.signinBtn} ${styles.orangeBtn}`}
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
