import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, CheckCircle2, AlertCircle } from "lucide-react";
import styles from "./FindTrashBin.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";
import AlertPopup from "../../components/AlertPopup";
import logoIcon from "../../assets/icon/logo.svg";

// Custom icons
const binMarkerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#10B981" stroke="white" stroke-width="2"/>
  <path d="M9 7h6v5H9z" fill="white" transform="scale(0.8) translate(3, 4)"/>
  <path d="M8 7h8v1H8z" fill="white" transform="scale(0.8) translate(3, 4)"/>
</svg>
`;

const BinIcon = L.divIcon({
    html: binMarkerSvg,
    className: "bin-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});

const DriverIcon = L.icon({
    iconUrl: logoIcon,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

// Helper component to center map
function MapController({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 15);
    }, [center, map]);
    return null;
}

const FindTrashBin = () => {
    const navigate = useNavigate();
    const [bins, setBins] = useState<any[]>([]);
    const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; type: "success" | "error" }>({
        isOpen: false,
        title: "",
        message: "",
        type: "success"
    });

    useEffect(() => {
        fetchBins();
        getCurrentLocation();

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setCurrentPos([pos.coords.latitude, pos.coords.longitude]);
            },
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const fetchBins = async () => {
        const token = getToken();
        if (!token) return;
        try {
            const data = await api.getTrashBinAddresses(token);
            setBins(data);
        } catch (error) {
            console.error("Failed to fetch bins:", error);
        }
    };

    const getCurrentLocation = () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCurrentPos([pos.coords.latitude, pos.coords.longitude]);
                setLoading(false);
            },
            (err) => {
                console.error(err);
                setLoading(false);
            }
        );
    };

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleDispose = async () => {
        if (!currentPos || bins.length === 0) return;

        let minDistance = Infinity;
        bins.forEach(bin => {
            const d = getDistance(currentPos[0], currentPos[1], parseFloat(bin.lat), parseFloat(bin.lng));
            if (d < minDistance) minDistance = d;
        });

        if (minDistance <= 10) {
            const token = getToken();
            if (token) {
                try {
                    await api.completeAllTrashPosts(token);
                    setAlert({
                        isOpen: true,
                        title: "Dispose Success",
                        message: "You have successfully disposed of the trash at the bin location.",
                        type: "success"
                    });
                } catch (error) {
                    console.error("Failed to complete posts:", error);
                    setAlert({
                        isOpen: true,
                        title: "Error",
                        message: "Failed to update job status. Please try again.",
                        type: "error"
                    });
                }
            }
        } else {
            setAlert({
                isOpen: true,
                title: "Too Far",
                message: `You are too far from the nearest trash bin (${minDistance.toFixed(1)}m). Please get closer (within 10m).`,
                type: "error"
            });
        }
    };

    const handleAlertClose = () => {
        const wasSuccess = alert.type === "success";
        setAlert(prev => ({ ...prev, isOpen: false }));
        if (wasSuccess) {
            navigate("/home", { state: { successMessage: "Jobs completed and trash disposed!" } });
        }
    };

    if (loading && !currentPos) {
        return (
            <div className={styles.page}>
                <PageHeader title="Find Trash Bin" backTo="/jobs/arrived-job" />
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Locating you...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageHeader title="Find Trash Bin" backTo="/jobs/arrived-job" />

            <div className={styles.mapContainer}>
                <MapContainer
                    center={currentPos || [13.7563, 100.5018]}
                    zoom={15}
                    className={styles.map}
                    attributionControl={false}
                >
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    
                    {currentPos && <MapController center={currentPos} />}

                    {currentPos && (
                        <Marker position={currentPos} icon={DriverIcon}>
                            <Popup>Your Location</Popup>
                        </Marker>
                    )}

                    {bins.map((bin) => (
                        <Marker
                            key={bin.address_id}
                            position={[parseFloat(bin.lat), parseFloat(bin.lng)]}
                            icon={BinIcon}
                        >
                            <Popup>
                                <div className={styles.popup}>
                                    <strong>{bin.label}</strong>
                                    <p>{bin.address}</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                <div className={styles.overlay}>
                    <div className={styles.nearestInfo}>
                        <Navigation size={16} />
                        <span>Find nearest bin to dispose trash</span>
                    </div>
                </div>
            </div>

            <PageFooter
                title="Dispose Trash"
                onClick={handleDispose}
                variant="green"
            />

            <AlertPopup
                isOpen={alert.isOpen}
                title={alert.title}
                message={
                    <div className={styles.alertMessage}>
                        {alert.type === "success" ? (
                            <CheckCircle2 size={48} color="#10B981" />
                        ) : (
                            <AlertCircle size={48} color="#EF4444" />
                        )}
                        <p>{alert.message}</p>
                    </div>
                }
                onClose={handleAlertClose}
            />
        </div>
    );
};

export default FindTrashBin;
