import { useState, useEffect } from "react";
import styles from "../sell/SelectAddress.module.css";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../services/auth";
import { api, Address } from "../../config/api";
import { useTrash } from "../../context/TrashContext";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";

function TrashSelectAddress() {
    const navigate = useNavigate();
    const { trashData, setAddress } = useTrash();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(trashData.address?.id || null);

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const data = await api.getAddresses(token);
            setAddresses(data);
            if (!selectedId) {
                const defaultAddr = data.find((addr: Address) => addr.is_default);
                if (defaultAddr) {
                    setSelectedId(defaultAddr.id);
                }
            }
        } catch (error) {
            console.error("Error fetching addresses:", error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (icon: string) => {
        switch (icon) {
            case 'home':
                return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>;
            case 'office':
                return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" /></svg>;
            default:
                return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>;
        }
    };

    const handleSelect = () => {
        if (!selectedId) {
            alert('Please select an address');
            return;
        }
        const selectedAddress = addresses.find(addr => addr.id === selectedId);
        if (selectedAddress) {
            setAddress(selectedAddress);
            navigate('/trash/confirm');
        }
    };

    if (loading) {
        return <div className={styles['loading-screen']}>Loading...</div>;
    }

    return (
        <div className={styles['page']}>
            <PageHeader title="Select Location" backTo="/trash/details" />

            <div className={styles['content']}>
                <div className={styles['section-header']}>
                    <h2 className={styles['section-title']}>Pickup Location</h2>
                    <p className={styles['section-subtitle']}>Where should we pick up your trash?</p>
                </div>

                <div className={styles['address-list']}>
                    {addresses.map((addr) => (
                        <div
                            key={addr.id}
                            className={`${styles['address-card']} ${selectedId === addr.id ? styles['selected'] : ''}`}
                            onClick={() => setSelectedId(addr.id)}
                        >
                            <div className={styles['address-icon']}>
                                {getIcon(addr.icon)}
                            </div>
                            <div className={styles['address-info']}>
                                <div className={styles['address-header']}>
                                    <span className={styles['address-label']}>{addr.label}</span>
                                    {addr.is_default && <span className={styles['default-badge']}>Default</span>}
                                </div>
                                <p className={styles['address-text']}>{addr.address}</p>
                                {addr.phone && <p className={styles['address-phone']}>{addr.phone}</p>}
                            </div>
                            <div className={styles['radio-container']}>
                                <div className={`${styles['radio']} ${selectedId === addr.id ? styles['radio-selected'] : ''}`}>
                                    {selectedId === addr.id && (
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className={styles['add-new-button']} onClick={() => navigate("/new-address", { state: { from: '/trash/select-address' } })}>
                        <span className={styles['plus-icon']}>+</span>
                        <span>Add New Address</span>
                    </div>
                </div>
            </div>

            <PageFooter
                title="Continue"
                onClick={handleSelect}
                disabled={!selectedId}
            />
        </div>
    );
}

export default TrashSelectAddress;
