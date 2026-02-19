import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styles from "./ExploreMap.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";
import MapSelector from "../../components/MapSelector";
import { watchPosition, clearWatch } from '@tauri-apps/plugin-geolocation';
import { useUser } from "../../context/UserContext";

interface Contact {
    id: string;
    address_snapshot?: {
        lat?: string;
        lng?: string;
        address?: string;
    };
}

function ExploreMap() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const { initialLocation } = useUser();
    const [contact, setContact] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(true);
    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);

    useEffect(() => {
        fetchContactDetails();

        let watchId: number | null = null;

        const startTracking = async () => {
            const isTauri = !!(window as any).__TAURI_INTERNALS__;

            if (isTauri) {
                try {
                    watchId = await watchPosition({ enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }, (pos, err) => {
                        if (err) {
                            console.error("Watch position error:", err);
                            return;
                        }
                        if (pos) {
                            console.log("Driver location changed (Tauri):", pos.coords.latitude, pos.coords.longitude);
                            setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        }
                    });
                    return;
                } catch (error) {
                    console.warn("Tauri watchPosition failed, trying Web API fallback:", error);
                }
            }

            if ("geolocation" in navigator) {
                navigator.geolocation.watchPosition(
                    (pos) => {
                        console.log("Driver location changed (Web):", pos.coords.latitude, pos.coords.longitude);
                        setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    },
                    (err) => {
                        console.warn("Web watchPosition timeout or brief error:", err);
                    },
                    { enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }
                );
            }
        };

        startTracking();

        return () => {
            if (watchId !== null) {
                clearWatch(watchId);
            }
        };
    }, [id]);

    const fetchContactDetails = async () => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        try {
            if (id) {
                const data = await api.getContact(token, id);
                setContact(data);
            }
        } catch (error) {
            console.error("Failed to fetch contact details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewContact = () => {
        if (id) {
            navigate(`/contact/${id}`, {
                state: {
                    fromExplore: true,
                    filter: location.state?.filter
                }
            });
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <PageHeader title="Job Exploration" backTo="/jobs/contacts" />
                <div className={styles.loading}>Loading map...</div>
            </div>
        );
    }

    if (!contact || !contact.address_snapshot?.lat || !contact.address_snapshot?.lng) {
        return (
            <div className={styles.page}>
                <PageHeader title="Job Exploration" backTo="/jobs/contacts" />
                <div className={styles.empty}>Location data not found for this contact.</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageHeader title="Job Exploration" backTo="/jobs/contacts" />

            <div className={styles.mapContainer}>
                <MapSelector
                    onLocationSelect={() => { }} // Read-only
                    initialLat={parseFloat(contact.address_snapshot.lat)}
                    initialLng={parseFloat(contact.address_snapshot.lng)}
                    driverLat={driverLocation?.lat}
                    driverLng={driverLocation?.lng}
                    isReadOnly={true}
                    showGpsButton={true}
                    onGpsClick={(lat, lng) => {
                        setDriverLocation({ lat, lng });
                        fetchContactDetails();
                    }}
                />
            </div>

            <PageFooter
                title="Contact Detail"
                onClick={handleViewContact}
                showArrow={true}
            />
        </div>
    );
}

export default ExploreMap;
