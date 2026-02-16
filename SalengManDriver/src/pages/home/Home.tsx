import { useUser } from "../../context/UserContext";
import { logOut } from "../../services/auth";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";

function Home() {
  const { user } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logOut();
    navigate("/signin");
  };

  return (
    <div className={styles.home}>
      <div className={styles.homeContent}>
        <h1 className={styles.title}>SalengMan Driver</h1>
        <p className={styles.welcome}>Welcome, {user?.full_name}!</p>
        <p className={styles.role}>Role: {user?.role}</p>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Home;
