import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { watchPosition, clearWatch } from '@tauri-apps/plugin-geolocation';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';
import { useUser } from '../../context/UserContext';
import PageHeader from '../../components/PageHeader';
import styles from './TrashBinMap.module.css';

interface TrashBin {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

// Green trash bin marker icon
const trashBinSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50" width="40" height="50" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));">
  <path d="M20 2C14.48 2 10 6.48 10 12c0 8.25 10 22 10 22s10-13.75 10-22C30 6.48 25.52 2 20 2z" fill="#4CAF50" stroke="white" stroke-width="2"/>
  <path d="M16 9h8M15 11h10l-1.5 8h-7L15 11z" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <rect x="17" y="13" width="1.5" height="5" rx="0.5" fill="white"/>
  <rect x="21" y="13" width="1.5" height="5" rx="0.5" fill="white"/>
</svg>
`;

const TrashBinIcon = L.divIcon({
  html: trashBinSvg,
  className: 'trash-bin-marker',
  iconSize: [40, 50],
  iconAnchor: [20, 50],
  popupAnchor: [0, -50],
});

// Highlighted (nearest) trash bin icon
const trashBinNearestSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50" width="40" height="50" style="filter: drop-shadow(0 2px 6px rgba(76,175,80,0.8));">
  <path d="M20 2C14.48 2 10 6.48 10 12c0 8.25 10 22 10 22s10-13.75 10-22C30 6.48 25.52 2 20 2z" fill="#2E7D32" stroke="#A5D6A7" stroke-width="2.5"/>
  <path d="M16 9h8M15 11h10l-1.5 8h-7L15 11z" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <rect x="17" y="13" width="1.5" height="5" rx="0.5" fill="white"/>
  <rect x="21" y="13" width="1.5" height="5" rx="0.5" fill="white"/>
</svg>
`;

const TrashBinNearestIcon = L.divIcon({
  html: trashBinNearestSvg,
  className: 'trash-bin-nearest-marker',
  iconSize: [40, 50],
  iconAnchor: [20, 50],
  popupAnchor: [0, -50],
});

// Blue circle driver icon
const driverSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
  <circle cx="20" cy="20" r="18" fill="white" stroke="#2196F3" stroke-width="2"/>
  <circle cx="20" cy="20" r="15" fill="#2196F3"/>
  <circle cx="20" cy="20" r="6" fill="white"/>
</svg>
`;

const DriverIcon = L.divIcon({
  html: driverSvg,
  className: 'driver-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

// Helper to fit map bounds around all points
function MapFitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (points.length > 0 && !fittedRef.current) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60], animate: true });
      fittedRef.current = true;
    }
  }, [points, map]);

  return null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TrashBinMap() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { initialLocation } = useUser();

  const [bins, setBins] = useState<TrashBin[]>([]);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);
  const [loading, setLoading] = useState(true);
  const [disposing, setDisposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch bins on mount
  useEffect(() => {
    const token = getToken();
    if (!token) { navigate('/signin'); return; }

    api.getTrashBins(token)
      .then(data => setBins(data.map((b: any) => ({ ...b, lat: parseFloat(b.lat), lng: parseFloat(b.lng) }))))
      .catch(() => setError('Failed to load trash bins'))
      .finally(() => setLoading(false));
  }, []);

  // Track driver location
  useEffect(() => {
    let watchId: number | null = null;
    const start = async () => {
      const isTauri = !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        try {
          watchId = await watchPosition({ enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }, (pos, err) => {
            if (!err && pos) setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          });
          return;
        } catch { }
      }
      if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(
          pos => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          null,
          { enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }
        );
      }
    };
    start();
    return () => { if (watchId !== null) clearWatch(watchId); };
  }, []);

  // Find nearest bin
  const binsWithDistance = bins.map(bin => ({
    ...bin,
    distance: driverLocation
      ? haversine(driverLocation.lat, driverLocation.lng, bin.lat, bin.lng)
      : Infinity,
  })).sort((a, b) => a.distance - b.distance);

  const nearestBin = binsWithDistance[0] || null;

  const mapPoints: [number, number][] = [
    ...(driverLocation ? [[driverLocation.lat, driverLocation.lng] as [number, number]] : []),
    ...bins.map(b => [b.lat, b.lng] as [number, number]),
  ];

  const handleConfirmDisposal = async () => {
    if (!driverLocation) {
      setError('Unable to get your current location.');
      return;
    }
    if (!contactId) return;

    const token = getToken();
    if (!token) return;

    setDisposing(true);
    setError(null);
    try {
      await api.disposeContact(token, contactId, driverLocation);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm disposal');
    } finally {
      setDisposing(false);
    }
  };

  const defaultCenter: [number, number] = driverLocation
    ? [driverLocation.lat, driverLocation.lng]
    : bins.length > 0
      ? [bins[0].lat, bins[0].lng]
      : [13.7563, 100.5018];

  return (
    <div className={styles.pageContainer}>
      <PageHeader title="Find Trash Bin" backTo="/history" />

      {loading ? (
        <div className={styles.loadingState}>Loading trash bins...</div>
      ) : (
        <>
          <div className={styles.mapWrapper}>
            <MapContainer
              center={defaultCenter}
              zoom={14}
              scrollWheelZoom={true}
              attributionControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

              <MapFitBounds points={mapPoints} />

              {/* Driver marker */}
              {driverLocation && (
                <Marker position={[driverLocation.lat, driverLocation.lng]} icon={DriverIcon}>
                  <Popup>Your Location</Popup>
                </Marker>
              )}

              {/* Trash bin markers */}
              {binsWithDistance.map((bin, idx) => (
                <Marker
                  key={bin.id}
                  position={[bin.lat, bin.lng]}
                  icon={idx === 0 ? TrashBinNearestIcon : TrashBinIcon}
                >
                  <Popup>
                    <strong>{bin.name}</strong>
                    {idx === 0 && <span className={styles.nearestTag}> ★ Nearest</span>}
                    <br />
                    {bin.address && <span>{bin.address}<br /></span>}
                    <span>
                      {bin.distance === Infinity
                        ? '—'
                        : bin.distance < 1000
                          ? `${Math.round(bin.distance)}m away`
                          : `${(bin.distance / 1000).toFixed(1)}km away`}
                    </span>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Info panel */}
          {nearestBin && (
            <div className={styles.infoPanel}>
              <div className={styles.nearestInfo}>
                <span className={styles.nearestLabel}>Nearest bin:</span>
                <span className={styles.nearestName}>{nearestBin.name}</span>
                <span className={styles.nearestDist}>
                  {nearestBin.distance === Infinity
                    ? '—'
                    : nearestBin.distance < 1000
                      ? `${Math.round(nearestBin.distance)}m`
                      : `${(nearestBin.distance / 1000).toFixed(1)}km`}
                </span>
              </div>
              {nearestBin.distance <= 100 && (
                <div className={styles.withinRange}>✓ Within 100m — ready to confirm</div>
              )}
            </div>
          )}

          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.bottomBar}>
            <button
              className={styles.confirmBtn}
              onClick={handleConfirmDisposal}
              disabled={disposing || !driverLocation}
            >
              {disposing ? 'Confirming...' : '🗑️ Confirm Disposal'}
            </button>
          </div>
        </>
      )}

      {/* Success popup */}
      {success && (
        <div className={styles.successOverlay}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✓</div>
            <h2>Disposal Confirmed!</h2>
            <p>Job marked as completed.</p>
            <button className={styles.successBtn} onClick={() => navigate('/history')}>
              Back to History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
