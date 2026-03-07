import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import styles from "./EsgTrackDriver.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import MapSelector from "../../components/MapSelector";
import { X, ChevronLeft, ChevronRight, Maximize2, Phone, Info, MapPin } from "lucide-react";

function EsgTrackDriver() {
    const navigate = useNavigate();
    const { driverId, taskId } = useParams<{ driverId: string; taskId: string }>();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode');

    const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [factoryLoc, setFactoryLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [factoryInfo, setFactoryInfo] = useState<any | null>(null);
    const [showFooter, setShowFooter] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isImageExpanded, setIsImageExpanded] = useState(false);

    useEffect(() => {
        fetchInitialData();
        const interval = setInterval(updateDriverLocation, 5000);
        return () => clearInterval(interval);
    }, [driverId, taskId]);

    const fetchInitialData = async () => {
        const token = getToken();
        if (!token || !driverId) {
            navigate("/signin");
            return;
        }

        try {
            // 1. Get user's default address for the "Home" marker
            const addresses = await api.getAddresses(token);
            const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
            if (defaultAddr && defaultAddr.lat && defaultAddr.lng) {
                setUserLoc({ lat: Number(defaultAddr.lat), lng: Number(defaultAddr.lng) });
            }

            // 2. Fetch task details for factory info if in factory mode
            if (taskId) {
                const data = await api.getEsgTaskById(token, taskId);
                const task = data.task;
                if (task.factory_lat && task.factory_lng) {
                    setFactoryLoc({
                        lat: Number(task.factory_lat),
                        lng: Number(task.factory_lng)
                    });

                    // Process factory images
                    let images = [];
                    if (task.factory_images) {
                        images = Array.isArray(task.factory_images) ? task.factory_images :
                            (typeof task.factory_images === 'string' ? JSON.parse(task.factory_images) : []);
                    }

                    setFactoryInfo({
                        label: task.factory_name,
                        address: task.factory_address,
                        phone: task.factory_phone,
                        note: task.factory_note,
                        images: images,
                        lat: task.factory_lat,
                        lng: task.factory_lng
                    });
                }
            }

            // 3. Initial driver location
            await updateDriverLocation();
        } catch (err) {
            console.error("Failed to fetch initial data:", err);
        } finally {
            setLoading(false);
        }
    };

    const updateDriverLocation = async () => {
        const token = getToken();
        if (!token || !driverId) return;
        try {
            const loc = await api.getDriverLocation(token, driverId);
            setDriverLoc({ lat: Number(loc.lat), lng: Number(loc.lng) });
        } catch (err) {
            console.error("Failed to fetch driver location:", err);
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <PageHeader title="Track Driver" backTo="/esg/dispose-trash" />
                <div className={styles.loading}>Loading map...</div>
            </div>
        );
    }

    const isFactoryMode = mode === 'factory' && factoryLoc;

    if (!userLoc) {
        return (
            <div className={styles.page}>
                <PageHeader title="Track Driver" backTo="/esg/dispose-trash" />
                <div className={styles.empty}>Your location data not found. Please set a default address.</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageHeader title="Track Driver" backTo="/esg/dispose-trash" />

            <div className={styles.mapContainer}>
                <MapSelector
                    onLocationSelect={() => { }} // Read-only
                    initialLat={isFactoryMode ? factoryLoc.lat : userLoc.lat}
                    initialLng={isFactoryMode ? factoryLoc.lng : userLoc.lng}
                    driverLat={driverLoc?.lat}
                    driverLng={driverLoc?.lng}
                    isReadOnly={true}
                    isFactory={!!isFactoryMode}
                    onMarkerClick={() => {
                        if (isFactoryMode && factoryInfo) {
                            setShowFooter(true);
                        }
                    }}
                />
            </div>

            {!showFooter && (
                <div className={styles.infoOverlay}>
                    <div className={styles.infoItem}>
                        <div className={styles.dot} style={{ backgroundColor: isFactoryMode ? '#4CAF50' : '#2196F3' }} />
                        <span>{isFactoryMode ? 'Recycling Factory' : 'Your Location (Home)'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <div className={styles.dot} style={{ backgroundColor: '#ff7a30' }} />
                        <span>Driver (Updates every 5s)</span>
                    </div>
                </div>
            )}

            {/* Factory Detail Footer */}
            {isFactoryMode && factoryInfo && (
                <div className={`${styles.footerOverlay} ${!showFooter ? styles.hidden : ""}`}>
                    <div className={styles.factoryHeader}>
                        <h3 className={styles.factoryTitle}>{factoryInfo.label}</h3>
                        <button className={styles.closeButton} onClick={() => setShowFooter(false)}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className={styles.factoryContent}>
                        {factoryInfo.images && factoryInfo.images.length > 0 && (
                            <div className={styles.factoryImageWrapper} onClick={() => setIsImageExpanded(true)}>
                                <img
                                    src={factoryInfo.images[currentImageIndex]}
                                    alt={factoryInfo.label}
                                    className={styles.factoryImage}
                                />

                                {factoryInfo.images.length > 1 && (
                                    <>
                                        <button className={`${styles.carouselBtn} ${styles.prev}`} onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrentImageIndex(prev => (prev - 1 + factoryInfo.images.length) % factoryInfo.images.length);
                                        }}>
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button className={`${styles.carouselBtn} ${styles.next}`} onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrentImageIndex(prev => (prev + 1) % factoryInfo.images.length);
                                        }}>
                                            <ChevronRight size={20} />
                                        </button>
                                        <div className={styles.pagination}>
                                            {factoryInfo.images.map((_: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className={`${styles.footerDot} ${idx === currentImageIndex ? styles.active : ""}`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}

                                <div className={styles.expandHint}>
                                    <Maximize2 size={14} />
                                    <span>Click to expand</span>
                                </div>
                            </div>
                        )}

                        <div className={styles.factoryInfo}>
                            <div className={styles.infoItemDetail}>
                                <MapPin size={16} className={styles.infoIcon} />
                                <span>{factoryInfo.address}</span>
                            </div>
                            {factoryInfo.phone && (
                                <div className={styles.infoItemDetail}>
                                    <Phone size={16} className={styles.infoIcon} />
                                    <span>{factoryInfo.phone}</span>
                                </div>
                            )}
                            {factoryInfo.note && (
                                <div className={styles.infoItemDetail}>
                                    <Info size={16} className={styles.infoIcon} />
                                    <span>{factoryInfo.note}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded Image Modal */}
            {isImageExpanded && factoryInfo?.images && (
                <div className={styles.modalOverlay} onClick={() => setIsImageExpanded(false)}>
                    <button className={styles.modalClose} onClick={() => setIsImageExpanded(false)}>
                        <X size={24} />
                    </button>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <img
                            src={factoryInfo.images[currentImageIndex]}
                            alt="Expanded factory"
                            className={styles.expandedImage}
                        />
                        {factoryInfo.images.length > 1 && (
                            <>
                                <button className={`${styles.modalBtn} ${styles.prev}`} onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex(prev => (prev - 1 + factoryInfo.images.length) % factoryInfo.images.length);
                                }}>
                                    <ChevronLeft size={32} />
                                </button>
                                <button className={`${styles.modalBtn} ${styles.next}`} onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex(prev => (prev + 1) % factoryInfo.images.length);
                                }}>
                                    <ChevronRight size={32} />
                                </button>
                                <div className={styles.modalPagination}>
                                    {currentImageIndex + 1} / {factoryInfo.images.length}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default EsgTrackDriver;
