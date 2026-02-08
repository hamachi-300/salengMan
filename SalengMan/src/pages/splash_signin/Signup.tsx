import { useState } from "react";
import styles from "./Signup.module.css";
import reactLogo from "../../assets/icon/logo.svg";
import { useNavigate } from "react-router-dom";
import { signUp } from "../../services/auth";

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUserName] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (username.length >= 10) {
      setError("Username must be less than 10 characters");
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, username, gender);
      navigate("/home");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.signup}>
      <div className={styles.signupContent}>
        <img src={reactLogo} alt="Logo" className={styles.logo} />
        <h1 className={styles.signupTitle}>Create Account</h1>
        <p className={styles.signupSubtitle}>Sign up ด้วยอีเมลของคุณ</p>
        <form onSubmit={handleSignup} className={styles.signupForm}>
          {/* Username */}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUserName(e.target.value)}
            className={styles.signupInput}
            required
          />
          {/* Gender */}
          <div className={styles.genderSection}>
            <div className={styles.genderLabel}>เพศ</div>
            <div className={styles.genderOptions}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={gender === "male"}
                  onChange={(e) => setGender(e.target.value)}
                />
                <span className={styles.radioCustom}></span>
                <span className={styles.radioText}>ชาย</span>
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={gender === "female"}
                  onChange={(e) => setGender(e.target.value)}
                />
                <span className={styles.radioCustom}></span>
                <span className={styles.radioText}>หญิง</span>
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="gender"
                  value="other"
                  checked={gender === "other"}
                  onChange={(e) => setGender(e.target.value)}
                />
                <span className={styles.radioCustom}></span>
                <span className={styles.radioText}>อื่นๆ</span>
              </label>
            </div>
          </div>
          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.signupInput}
            required
          />
          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.signupInput}
            required
          />
          {error && <p className={styles.errorMessage}>{error}</p>}
          <div className={styles.buttonDiv}>
            <button type="submit" className={`${styles.signupBtn} ${styles.orangeBtn}`} disabled={loading}>
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </button>
            <button
              type="button"
              className={`${styles.signupBtn} ${styles.darkBtn}`}
              onClick={() => navigate("/signin")}
            >
              Back to Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Signup;
