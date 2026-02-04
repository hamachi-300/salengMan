import { useState, useEffect } from "react";
import styles from "./AddAddress.module.css";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../services/auth";
import { api } from "../../config/api";

function AddAddress() {
    const navigate = useNavigate();
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        const fetchAddress = async () => {
            const token = getToken();
            if (token) {
                try {
                    const user = await api.getMe(token);
                    if ((user as any).address) {
                        setAddress((user as any).address);
                    }
                } catch (error) {
                    console.error("Error fetching address:", error);
                }
            }
            setFetching(false);
        };
        fetchAddress();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = getToken();
        if (!token) return;

        setLoading(true);
        try {
            await api.updateUser(token, { address: address } as any);
            navigate("/account");
        } catch (error) {
            console.error("Error saving address:", error);
            alert("Failed to save address.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="loading-screen">Loading...</div>;

    return (
        <div className={styles.addAddress}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <button className={styles.backButton} onClick={() => navigate("/account")}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                    </button>
                    <h1 className={styles.title}>Address</h1>
                </div>

                <form className={styles.form} onSubmit={handleSave}>
                    <label className={styles.label}>Enter your address</label>
                    <textarea
                        className={styles.textarea}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="123 Recycling Road, Eco District, Bangkok 10110"
                    />
                    <button type="submit" className={styles.saveButton} disabled={loading}>
                        {loading ? "Saving..." : "Save Address"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AddAddress;
