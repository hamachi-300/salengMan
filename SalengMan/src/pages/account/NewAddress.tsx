import { useState, useEffect } from "react";
import styles from "./NewAddress.module.css";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getToken } from "../../services/auth";
import { api, CreateAddressData } from "../../config/api";
import MapSelector from "../../components/MapSelector";
import ConfirmPopup from "../../components/ConfirmPopup";
import { useUser } from "../../context/UserContext";

function NewAddress() {
    const navigate = useNavigate();
    const routeLocation = useLocation();
    const { id } = useParams<{ id: string }>();
    const { updateUserLocal } = useUser();
    const returnPath = (routeLocation.state as { from?: string })?.from || "/add-address";
    const [loading, setLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    // Form State
    const [label, setLabel] = useState("");
    const [phone, setPhone] = useState("");
    const [note, setNote] = useState("");
    const [isDefault, setIsDefault] = useState(false);
    const [isOnlyAddress, setIsOnlyAddress] = useState(false);

    // Location Data
    const [location, setLocation] = useState<{
        lat: number;
        lng: number;
        address: string;
        province: string;
        district: string;
        sub_district: string;
        zipcode: string;
    } | null>(null);

    // Fetch address data if editing
    useEffect(() => {
        const checkAddressCount = async () => {
            const token = getToken();
            if (!token) return;
            try {
                const addresses = await api.getAddresses(token);
                if (addresses.length === 1 && id && addresses[0].id === parseInt(id)) {
                    setIsOnlyAddress(true);
                    setIsDefault(true);
                }
            } catch (err) {
                console.error(err);
            }
        };

        if (id) {
            fetchAddressDetails(id);
            checkAddressCount();
        }
    }, [id]);

    const fetchAddressDetails = async (addressId: string) => {
        setLoading(true);
        const token = getToken();
        if (!token) return;

        try {
            const data = await api.getAddress(token, addressId);
            setLabel(data.label);
            setPhone(data.phone || "");
            setNote(data.note || "");
            setIsDefault(data.is_default);
            setLocation({
                lat: data.lat ? parseFloat(data.lat.toString()) : 0,
                lng: data.lng ? parseFloat(data.lng.toString()) : 0,
                address: data.address, // Correct property name
                province: data.province || "",
                district: data.district || "",
                sub_district: data.sub_district || "",
                zipcode: data.zipcode || ""
            });
        } catch (error) {
            console.error("Error fetching address:", error);
            alert("Failed to load address details");
            navigate(returnPath);
        } finally {
            setLoading(false);
        }
    };

    // Phone formatter
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        if (value.length > 10) value = value.slice(0, 10);

        // Format as 000-000-0000
        if (value.length > 6) {
            value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
        } else if (value.length > 3) {
            value = `${value.slice(0, 3)}-${value.slice(3)}`;
        }

        setPhone(value);
    };

    const handleSave = async () => {
        if (!label || !phone || !location) {
            alert("Please fill in all required fields and select a location.");
            return;
        }

        // Phone validation regex for 000-000-0000
        const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
        if (!phoneRegex.test(phone)) {
            alert("Phone number must be in format 000-000-0000");
            return;
        }

        setLoading(true);
        const token = getToken();

        if (!token) {
            navigate("/signin");
            return;
        }

        try {
            const data: CreateAddressData = {
                label,
                phone,
                note,
                address: location.address,
                lat: location.lat,
                lng: location.lng,
                is_default: isDefault,
                province: location.province,
                district: location.district,
                sub_district: location.sub_district,
                zipcode: location.zipcode
            };

            if (id) {
                await api.updateAddress(token, id, data);
            } else {
                await api.createAddress(token, data);
            }

            // Sync user context if default
            if (isDefault || isOnlyAddress) {
                updateUserLocal({ default_address: location.address });
            }

            navigate(returnPath);
        } catch (error) {
            console.error("Error saving address:", error);
            alert("Failed to save address. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        const token = getToken();
        if (!token || !id) return;

        try {
            await api.deleteAddress(token, parseInt(id));
            navigate(returnPath);
        } catch (e) {
            console.error(e);
            alert("Failed to delete address");
        } finally {
            setLoading(false);
            setShowConfirmDelete(false);
        }
    };

    const handleLocationSelect = (loc: any) => {
        setLocation(loc);
    };

    const confirmLocation = () => {
        if (!location) {
            alert("Please select a location on the map");
            return;
        }
        setShowMap(false);
    }

    return (
        <div className={styles.page}>
            {/* Confirmation Modal */}
            <ConfirmPopup
                isOpen={showConfirmDelete}
                title="Delete Address?"
                message="คุณแน่ใจหรือไม่ว่าต้องการลบที่อยู่นี้ การกระทำนี้ไม่สามารถย้อนกลับได้"
                onConfirm={handleDelete}
                onCancel={() => setShowConfirmDelete(false)}
                isLoading={loading}
                confirmText="Delete"
                cancelText="Cancel"
            />

            {/* Map Modal */}
            {showMap && (
                <div className={styles.mapModal}>
                    <div className={styles.mapHeader}>
                        <button className={styles.backButton} onClick={() => setShowMap(false)}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                            </svg>
                        </button>
                        <h1 className={styles.title}>Select Location</h1>
                    </div>
                    <div className={styles.mapContent}>
                        <MapSelector
                            onLocationSelect={handleLocationSelect}
                            initialLat={location?.lat}
                            initialLng={location?.lng}
                        />
                        {location && (
                            <button className={styles.mapConfirmButton} onClick={confirmLocation}>
                                Confirm Location
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className={styles.content}>
                {/* Header */}
                <div className={styles.header}>
                    <button className={styles.backButton} onClick={() => navigate(returnPath)}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                    </button>
                    <h1 className={styles.title}>{id ? "Edit Address" : "New Address"}</h1>
                </div>

                <div className={styles.form}>
                    {/* Label */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>ชื่อที่อยู่ (ex. บ้านหนองอีหรี)</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="e.g. Home, Office, Condo"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                        />
                    </div>

                    {/* Phone */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>หมายเลขโทรศัพท์</label>
                        <input
                            type="tel"
                            className={styles.input}
                            placeholder="000-000-0000"
                            value={phone}
                            onChange={handlePhoneChange}
                            maxLength={12}
                        />
                    </div>

                    {/* Address Selector */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>ตำแหน่งที่อยู่</label>
                        <div className={styles.addressSelector} onClick={() => setShowMap(true)}>
                            <div className={styles.addressIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                </svg>
                            </div>
                            <div className={styles.addressContent}>
                                {location ? (
                                    <p className={styles.addressText}>{location.address}</p>
                                ) : (
                                    <span className={styles.addressPlaceholder}>Click to select location on map</span>
                                )}
                            </div>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="#888">
                                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                            </svg>
                        </div>
                    </div>

                    {/* Note */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>หมายเหตุ (Optional)</label>
                        <textarea
                            className={`${styles.input} ${styles.textarea}`}
                            placeholder="รายละเอียดเกี่ยวกับที่อยู่เพิ่มเติม"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    {/* Default Address Toggle */}
                    <div className={styles.toggleRow}>
                        <span className={styles.toggleLabel}>ตั้งเป็นที่อยู่เริ่มต้น (Default)</span>
                        <label className={styles.toggle}>
                            <input
                                type="checkbox"
                                checked={isDefault}
                                onChange={(e) => setIsDefault(e.target.checked)}
                                disabled={isOnlyAddress}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>

                    <div className={styles.buttonGroup}>
                        <button
                            className={styles.saveButton}
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : (id ? 'Update Address' : 'Save Address')}
                        </button>

                        {id && (
                            <button
                                className={styles.deleteButton}
                                onClick={() => setShowConfirmDelete(true)}
                                disabled={loading}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NewAddress;
