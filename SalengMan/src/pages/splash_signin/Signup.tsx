import { useState } from "react";
import "./Signup.css";
import reactLogo from "../../assets/icon/logo.svg";
import { useNavigate } from "react-router-dom";
import { signUp } from "../../services/auth";

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
      navigate("/home"); // Navigate to home after signup
    } catch (err: any) {
      const errorCode = err.code;
      switch (errorCode) {
        case "auth/email-already-in-use":
          setError("Email already in use. Please sign in instead.");
          break;
        case "auth/invalid-email":
          setError("Invalid email address.");
          break;
        case "auth/weak-password":
          setError("Password is too weak.");
          break;
        default:
          setError(err.message || "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup">
      <div className="signup-content">
        <img src={reactLogo} alt="Logo" className="logo" />
        <h1 className="signup-title">Create Account</h1>
        <p className="signup-subtitle">Sign up with your email</p>
        <form onSubmit={handleSignup} className="signup-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="signup-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="signup-input"
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="signup-input"
            required
          />
          {error && <p className="error-message">{error}</p>}
          <div className="button-div">
            <button type="submit" className="signup-btn orange-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </button>
            <button
              type="button"
              className="signup-btn dark-btn"
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
