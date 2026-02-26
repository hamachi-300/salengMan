import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./HelpSupport.module.css";
import PageHeader from "../../components/PageHeader";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import AlertPopup from "../../components/AlertPopup";

function HelpSupport() {
    const navigate = useNavigate();
    const [header, setHeader] = useState("");
    const [content, setContent] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: "",
        message: ""
    });

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
                message: "Please fill in both the header and content of your report."
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
            await api.submitProblemReport(token, header, content, image || undefined);
            setAlert({
                isOpen: true,
                title: "Success",
                message: "Your report has been submitted. Thank you for your feedback!"
            });
            // Clear form
            setHeader("");
            setContent("");
            setImage(null);
        } catch (error) {
            console.error("Failed to submit report:", error);
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
            <PageHeader title="Help & Support" />

            <div className={styles.content}>
                <div className={styles.introSection}>
                    <h2>Report a Problem</h2>
                    <p>Found a bug or having trouble with the app? Let us know the details below.</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="header">Subject</label>
                        <input
                            id="header"
                            type="text"
                            placeholder="e.g., App crashes on home screen"
                            value={header}
                            onChange={(e) => setHeader(e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="content">Description</label>
                        <textarea
                            id="content"
                            placeholder="Please describe the issue in detail..."
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
                                    <span>Upload Image</span>
                                </label>
                            )}
                        </div>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? "Submitting..." : "Submit Report"}
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

export default HelpSupport;
