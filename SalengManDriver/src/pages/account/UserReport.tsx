import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./UserReport.module.css";
import PageHeader from "../../components/PageHeader";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import AlertPopup from "../../components/AlertPopup";
import profileLogo from "../../assets/icon/profile.svg";

function UserReport() {
    const navigate = useNavigate();
    const location = useLocation();
    const reportedUser = location.state?.reportedUser;

    const [header, setHeader] = useState("");
    const [content, setContent] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: "",
        message: ""
    });

    if (!reportedUser) {
        return (
            <div className={styles.pageContainer}>
                <PageHeader title="User Report" onBack={() => navigate(-1)} />
                <div className={styles.errorState}>No user selected to report.</div>
            </div>
        );
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!header || !content) {
            setAlert({
                isOpen: true,
                title: "Missing Information",
                message: "Please fill in both the reason and details of your report."
            });
            return;
        }

        setLoading(true);
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        try {
            await api.submitUserReport(token, reportedUser.id, header, content, image || undefined);
            setAlert({
                isOpen: true,
                title: "Success",
                message: "The user has been reported. We will review your report shortly."
            });
        } catch (error) {
            console.error("Failed to submit user report:", error);
            setAlert({
                isOpen: true,
                title: "Error",
                message: "Failed to submit report. Please try again later."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <PageHeader title="Report User" onBack={() => navigate(-1)} />

            <div className={styles.content}>
                <div className={styles.reportedUserCard}>
                    <img src={reportedUser.avatar_url || profileLogo} alt="Avatar" className={styles.miniAvatar} />
                    <div className={styles.miniInfo}>
                        <span className={styles.miniName}>{reportedUser.full_name}</span>
                        <span className={styles.miniLabel}>Reported User</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="header">Reason for Report</label>
                        <input
                            id="header"
                            type="text"
                            placeholder="e.g., Unprofessional behavior, Fake account"
                            value={header}
                            onChange={(e) => setHeader(e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="content">Details</label>
                        <textarea
                            id="content"
                            placeholder="Provide more details about the issue..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className={styles.textarea}
                            rows={5}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Evidence Image (Optional)</label>
                        <div className={styles.imageUploadWrapper}>
                            {image ? (
                                <div className={styles.imagePreviewWrapper}>
                                    <img src={image} alt="Evidence" className={styles.imagePreview} />
                                    <button type="button" onClick={() => setImage(null)} className={styles.removeImageBtn}>
                                        &times;
                                    </button>
                                </div>
                            ) : (
                                <label className={styles.uploadPlaceholder}>
                                    <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    <span>Upload Evidence</span>
                                </label>
                            )}
                        </div>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? "Submitting..." : "Submit User Report"}
                    </button>
                </form>
            </div>

            <AlertPopup
                isOpen={alert.isOpen}
                title={alert.title}
                message={alert.message}
                onClose={() => {
                    setAlert({ ...alert, isOpen: false });
                    if (alert.title === "Success") {
                        navigate(-1);
                    }
                }}
            />
        </div>
    );
}

export default UserReport;
