import "./SignIn.css";
import reactLogo from "../../assets/icon/logo.svg";
import { useNavigate } from "react-router-dom";

function SignIn() {
  const navigate = useNavigate();

  return (
    <div className="signin">
      <div className="signin-content">
        <h1 className="signin-title">Sign In</h1>
        <img src={reactLogo} alt="Logo" className="logo" />
        <div className="button-div">
          <button
            className="signin-btn dark-btn"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            className="signin-btn orange-btn"
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
