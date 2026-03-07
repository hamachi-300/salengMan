import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./EsgChooseFactory.module.css";
import { api } from "../../config/api";
import PageHeader from "../../components/PageHeader";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { watchPosition, clearWatch } from "@tauri-apps/plugin-geolocation";
import { useUser } from "../../context/UserContext";
import { MapPin, Phone, Info, X, Map as MapIcon, ChevronLeft, ChevronRight, Maximize2, LocateFixed } from "lucide-react";
import logoIcon from "../../assets/icon/logo.svg";
import { getToken } from "../../services/auth";
import AlertPopup from "../../components/AlertPopup";

const CARBON_RATES: Record<string, number> = {
    "กระดาษ": 0.8,
    "พลาสติก": 1.5,
    "โลหะและอลูมิเนียม": 2.5,
    "แก้ว": 0.5
};

// Custom icons
const DriverIcon = L.icon({
    iconUrl: logoIcon,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: "driver-marker"
});

const FactoryIcon = L.divIcon({
    html: `
    <div style="background: #22c55e; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
        <svg viewBox="0 0 512 512" width="24" height="24" fill="white">
            <path d="M0 480h512V192L256 64 0 192v288zm120-160h272v160H120V320z"/>
        </svg>
    </div>
    `,
    className: "factory-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

const SelectedFactoryIcon = L.divIcon({
    html: `
    <div style="background: #15803d; width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 6px 15px rgba(0,0,0,0.4); transform: scale(1.1); transition: all 0.2s;">
        <svg viewBox="0 0 512 512" width="30" height="30" fill="white">
            <path d="M0 480h512V192L256 64 0 192v288zm120-160h272v160H120V320z"/>
        </svg>
    </div>
    `,
    className: "factory-marker-selected",
    iconSize: [48, 48],
    iconAnchor: [24, 24]
});

// Helper for distance calculation (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(2)} km`;
}

// Helper to update map view
function MapController({ center, trigger }: { center: [number, number] | null, trigger: number }) {
    const map = useMap();

    useEffect(() => {
        if (center) {
            // We only want to fly to the center if it's the first time 
            // or if the coordinates have actually changed.
            // Using [center[0], center[1]] as dependencies instead of the array reference.
            map.flyTo(center, map.getZoom());
        }
    }, [center?.[0], center?.[1], trigger, map]);

    return null;
}

function EsgChooseFactory() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { initialLocation } = useUser();
    const [factories, setFactories] = useState<any[]>([]);
    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);
    const [selectedFactory, setSelectedFactory] = useState<any | null>(null);
    const [mapTheme, setMapTheme] = useState<'light' | 'dark' | 'satellite'>('dark');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isImageExpanded, setIsImageExpanded] = useState(false);
    const [centerTrigger, setCenterTrigger] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFactories();

        let watchId: number | null = null;
        const startTracking = async () => {
            const isTauri = !!(window as any).__TAURI_INTERNALS__;
            if (isTauri) {
                try {
                    watchId = await watchPosition({ enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }, (pos, err) => {
                        if (err) return;
                        if (pos) setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    });
                } catch (error) {
                    console.warn("Tauri tracking error", error);
                }
            } else if ("geolocation" in navigator) {
                navigator.geolocation.watchPosition(
                    (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    null,
                    { enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }
                );
            }
        };

        startTracking();
        return () => {
            if (watchId !== null) clearWatch(watchId);
        };
    }, []);

    const fetchFactories = async () => {
        try {
            const data = await api.getRecyclingAddresses();
            // Handle postgres JSON/Array parsing if needed
            const processedData = data.map(f => ({
                ...f,
                images: typeof f.images === 'string' ? JSON.parse(f.images) : f.images
            }));
            setFactories(processedData);
        } catch (error) {
            console.error("Failed to fetch factories:", error);
        }
    };

    const calculateCarbonReduce = (trashList: any[]) => {
        return trashList.reduce((total, item) => {
            const rate = CARBON_RATES[item.type] || 0;
            const weight = parseFloat(item.weight) || 0;
            return total + (rate * weight);
        }, 0);
    };

    const handleSelectFactory = async () => {
        if (!id || !selectedFactory || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const token = getToken();
            if (!token) throw new Error("No authentication token found");

            // Load trash info from localStorage
            const savedDataStr = localStorage.getItem(`trash_info_${id}`);
            if (!savedDataStr) throw new Error("ไม่พบข้อมูลขยะที่บันทึกไว้");

            const { trashList } = JSON.parse(savedDataStr);
            if (!trashList || trashList.length === 0) throw new Error("กรุณาเพิ่มข้อมูลขยะก่อน");

            const carbon_reduce = calculateCarbonReduce(trashList);

            await api.completeEsgTask(token, id, {
                weight: trashList.map((t: any) => ({ type: t.type, weight: t.weight })),
                carbon_reduce,
                recycling_center_addresss: selectedFactory.label + " - " + selectedFactory.address
            });

            // Success!
            localStorage.removeItem(`trash_info_${id}`);
            setShowSuccess(true);
            setSelectedFactory(null);
        } catch (err: any) {
            console.error("Failed to complete task", err);
            setError(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedFactory?.images) return;
        setCurrentImageIndex((prev) => (prev + 1) % selectedFactory.images.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedFactory?.images) return;
        setCurrentImageIndex((prev) => (prev - 1 + selectedFactory.images.length) % selectedFactory.images.length);
    };

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsImageExpanded(!isImageExpanded);
    };

    const cycleTheme = () => {
        setMapTheme(current => {
            if (current === 'dark') return 'light';
            if (current === 'light') return 'satellite';
            return 'dark';
        });
    };

    const getThemeIcon = () => {
        switch (mapTheme) {
            case 'dark':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                    </svg>
                );
            case 'light':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                    </svg>
                );
            case 'satellite':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                    </svg>
                );
        }
    };

    const mapCenter: [number, number] = driverLocation ? [driverLocation.lat, driverLocation.lng] : [13.7563, 100.5018];

    return (
        <div className={styles.page}>
            <PageHeader title="เลือกโรงงานรีไซเคิล" onBack={() => navigate(-1)} />

            <div className={styles.mapContainer}>
                <MapContainer
                    center={mapCenter}
                    zoom={15}
                    style={{ height: "100%", width: "100%" }}
                    zoomControl={false}
                >
                    <TileLayer
                        key={mapTheme}
                        url={mapTheme === 'dark'
                            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            : mapTheme === 'light'
                                ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        }
                    />
                    <MapController center={driverLocation ? [driverLocation.lat, driverLocation.lng] : null} trigger={centerTrigger} />

                    {/* Floating Map Controls */}
                    <div className={styles.mapControls}>
                        <button
                            className={styles.controlButton}
                            onClick={cycleTheme}
                            title="Switch Theme"
                        >
                            {getThemeIcon()}
                        </button>
                        <button
                            className={styles.controlButton}
                            onClick={() => setCenterTrigger(prev => prev + 1)}
                            title="Re-center to my location"
                        >
                            <LocateFixed size={20} />
                        </button>
                    </div>

                    {driverLocation && (
                        <Marker position={[driverLocation.lat, driverLocation.lng]} icon={DriverIcon}>
                            {/* No popup requested, just icon */}
                        </Marker>
                    )}

                    {factories.map((factory) => (
                        <Marker
                            key={factory.address_id}
                            position={[parseFloat(factory.lat), parseFloat(factory.lng)]}
                            icon={selectedFactory?.address_id === factory.address_id ? SelectedFactoryIcon : FactoryIcon}
                            eventHandlers={{
                                click: () => setSelectedFactory(factory)
                            }}
                        />
                    ))}
                </MapContainer>
            </div>

            {/* Factory Detail Footer */}
            <div className={`${styles.footerOverlay} ${!selectedFactory ? styles.hidden : ""}`}>
                {selectedFactory && (
                    <>
                        <div className={styles.factoryHeader}>
                            <h3 className={styles.factoryTitle}>{selectedFactory.label}</h3>
                            <button className={styles.closeButton} onClick={() => setSelectedFactory(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className={styles.factoryContent}>
                            {selectedFactory.images && selectedFactory.images.length > 0 && (
                                <div className={styles.factoryImageWrapper} onClick={toggleExpand}>
                                    <img
                                        src={selectedFactory.images[currentImageIndex]}
                                        alt={selectedFactory.label}
                                        className={styles.factoryImage}
                                    />

                                    {selectedFactory.images.length > 1 && (
                                        <>
                                            <button className={`${styles.carouselBtn} ${styles.prev}`} onClick={prevImage}>
                                                <ChevronLeft size={20} />
                                            </button>
                                            <button className={`${styles.carouselBtn} ${styles.next}`} onClick={nextImage}>
                                                <ChevronRight size={20} />
                                            </button>
                                            <div className={styles.pagination}>
                                                {selectedFactory.images.map((_: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className={`${styles.dot} ${idx === currentImageIndex ? styles.active : ""}`}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    <div className={styles.expandHint}>
                                        <Maximize2 size={14} />
                                        <span>Click to expand</span>
                                    </div>

                                    {driverLocation && (
                                        <div className={styles.distanceBadge}>
                                            <MapIcon size={14} />
                                            <span>{calculateDistance(driverLocation.lat, driverLocation.lng, parseFloat(selectedFactory.lat), parseFloat(selectedFactory.lng))}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={styles.factoryInfo}>
                                <div className={styles.infoItem}>
                                    <MapPin size={16} className={styles.infoIcon} />
                                    <span>{selectedFactory.address}</span>
                                </div>
                                {selectedFactory.phone && (
                                    <div className={styles.infoItem}>
                                        <Phone size={16} className={styles.infoIcon} />
                                        <span>{selectedFactory.phone}</span>
                                    </div>
                                )}
                                {selectedFactory.note && (
                                    <div className={styles.infoItem}>
                                        <Info size={16} className={styles.infoIcon} />
                                        <span>{selectedFactory.note}</span>
                                    </div>
                                )}
                                {!selectedFactory.images && driverLocation && (
                                    <div className={styles.infoItem}>
                                        <MapIcon size={16} className={styles.infoIcon} />
                                        <span style={{ fontWeight: 700, color: 'var(--orange-button)' }}>
                                            ระยะทาง: {calculateDistance(driverLocation.lat, driverLocation.lng, parseFloat(selectedFactory.lat), parseFloat(selectedFactory.lng))}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            className={styles.footerButton}
                            onClick={handleSelectFactory}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "กำลังส่งข้อมูล..." : "เลือกโรงงานรีไซเคิล"}
                        </button>
                    </>
                )}
            </div>

            {/* Expanded Image Modal */}
            {isImageExpanded && selectedFactory?.images && (
                <div className={styles.modalOverlay} onClick={toggleExpand}>
                    <button className={styles.modalClose} onClick={toggleExpand}>
                        <X size={24} />
                    </button>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <img
                            src={selectedFactory.images[currentImageIndex]}
                            alt="Expanded factory"
                            className={styles.expandedImage}
                        />
                        {selectedFactory.images.length > 1 && (
                            <>
                                <button className={`${styles.modalBtn} ${styles.prev}`} onClick={prevImage}>
                                    <ChevronLeft size={32} />
                                </button>
                                <button className={`${styles.modalBtn} ${styles.next}`} onClick={nextImage}>
                                    <ChevronRight size={32} />
                                </button>
                                <div className={styles.modalPagination}>
                                    {currentImageIndex + 1} / {selectedFactory.images.length}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <AlertPopup
                isOpen={showSuccess}
                title="สำเร็จ!"
                message="บันทึกข้อมูลการเก็บขยะเรียบร้อยแล้ว"
                onClose={() => {
                    setShowSuccess(false);
                    navigate(`/esg/task-monitor/${id}`);
                }}
            />

            <AlertPopup
                isOpen={error !== null}
                title="เกิดข้อผิดพลาด"
                message={error || ""}
                onClose={() => setError(null)}
            />
        </div>
    );
}

export default EsgChooseFactory;
