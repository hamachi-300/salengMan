import { useState } from "react";
import styles from "./Login.module.css";
import reactLogo from "../../assets/icon/logo.svg";
import { useNavigate } from "react-router-dom";
import { signIn } from "../../services/auth";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Always use 'seller' role for SalengMan app
      const result = await signIn(email, password, 'seller');

      if (result.user) {
        navigate("/home");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.login}>
      <div className={styles.loginContent}>
        <img src={reactLogo} alt="Logo" className={styles.logo} />
        <h1 className={styles.loginTitle}>Welcome Back</h1>
        <p className={styles.loginSubtitle}>Sign in ด้วยอีเมลของคุณ</p>
        <form onSubmit={handleLogin} className={styles.loginForm}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.loginInput}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.loginInput}
            required
          />
          {error && <p className={styles.errorMessage}>{error}</p>}
          <div className={styles.buttonDiv}>
            <button type="submit" className={`${styles.loginBtn} ${styles.darkBtn}`} disabled={loading}>
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </button>
            <p className={styles.signupLink}>
              ยังไม่มี Account ใช่ไหม?{" "}
              <span onClick={() => navigate("/signup")}>Sign Up</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
