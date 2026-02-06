import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getCurrentPosition } from '@tauri-apps/plugin-geolocation';
import 'leaflet/dist/leaflet.css';
import styles from './MapSelector.module.css';

// Custom orange marker icon
const orangeMarkerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="48">
  <path fill="#ff7a30" stroke="#cc5500" stroke-width="1" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z"/>
  <circle fill="white" cx="12" cy="12" r="5"/>
</svg>
`;

const OrangeIcon = L.divIcon({
    html: orangeMarkerSvg,
    className: 'orange-marker',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -48]
});

L.Marker.prototype.options.icon = OrangeIcon;

// Map tile configurations
const MAP_TILES = {
    dark: {
        url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
        label: 'Dark'
    },
    light: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        label: 'Light'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        label: 'Satellite'
    }
};

type MapTheme = 'dark' | 'light' | 'satellite';

interface MapSelectorProps {
    onLocationSelect: (location: {
        lat: number;
        lng: number;
        address: string;
        province: string;
        district: string;
        sub_district: string;
        zipcode: string;
    }) => void;
    initialLat?: number;
    initialLng?: number;
}

const LocationMarker = ({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) => {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
        dragend() {
            // Logic if we want map drag to center marker?
            // For now click is enough
        }
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position} />
    );
};

// Detect system color scheme
const getSystemTheme = (): 'dark' | 'light' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
};

export default function MapSelector({ onLocationSelect, initialLat, initialLng }: MapSelectorProps) {
    const [position, setPosition] = useState<L.LatLng | null>(
        initialLat && initialLng ? new L.LatLng(initialLat, initialLng) : null
    );
    const [loading, setLoading] = useState(false);
    const [mapTheme, setMapTheme] = useState<MapTheme>(getSystemTheme());

    // Default to Bangkok if no location
    const center = initialLat && initialLng ? [initialLat, initialLng] : [13.7563, 100.5018];

    useEffect(() => {
        if (initialLat && initialLng) {
            setPosition(new L.LatLng(initialLat, initialLng));
        }
    }, [initialLat, initialLng]);

    const handleGetCurrentLocation = async () => {
        setLoading(true);

        try {
            const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
            const { latitude, longitude } = pos.coords;
            const newPos = new L.LatLng(latitude, longitude);
            setPosition(newPos);
            setLoading(false);
            extractAddress(latitude, longitude);
            return;
        } catch (error) {
            console.warn("Tauri geolocation failed, falling back to browser API:", error);
        }

        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const newPos = new L.LatLng(latitude, longitude);
                setPosition(newPos);
                setLoading(false);
                extractAddress(latitude, longitude);
            },
            (err) => {
                console.error("Error getting location:", err.code, err.message);
                setLoading(false);
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        alert("Location permission denied. Please allow location access.");
                        break;
                    case err.POSITION_UNAVAILABLE:
                        alert("Location unavailable. Please check if GPS is enabled.");
                        break;
                    case err.TIMEOUT:
                        alert("Location request timed out. Please try again.");
                        break;
                    default:
                        alert("Could not get your location. Please select manually on the map.");
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const extractAddress = async (lat: number, lng: number) => {
        setLoading(true);
        try {
            // Use Nominatim OpenStreetMap API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'th' } }
            );
            const data = await response.json();

            if (data && data.address) {
                const addr = data.address;
                const fullAddress = data.display_name;

                const result = {
                    lat,
                    lng,
                    address: fullAddress,
                    province: addr.province || addr.state || addr.city || "",
                    district: addr.district || addr.county || "",
                    sub_district: addr.suburb || addr.quarter || "",
                    zipcode: addr.postcode || ""
                };

                onLocationSelect(result);
            }
        } catch (error) {
            console.error("Error extracting address:", error);
            onLocationSelect({
                lat,
                lng,
                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                province: "",
                district: "",
                sub_district: "",
                zipcode: ""
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePositionChange = (pos: L.LatLng) => {
        setPosition(pos);
        extractAddress(pos.lat, pos.lng);
    };

    // Cycle through themes: dark -> light -> satellite -> dark
    const cycleTheme = () => {
        setMapTheme(current => {
            if (current === 'dark') return 'light';
            if (current === 'light') return 'satellite';
            return 'dark';
        });
    };

    // Get icon for current theme
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

    return (
        <div className={styles.container}>
            <MapContainer
                center={center as L.LatLngExpression}
                zoom={13}
                scrollWheelZoom={true}
                attributionControl={false}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    key={mapTheme}
                    url={MAP_TILES[mapTheme].url}
                />
                <LocationMarker position={position} setPosition={handlePositionChange} />
            </MapContainer>

            {/* Theme Toggle Button */}
            <button
                className={styles.themeButton}
                onClick={cycleTheme}
                title={`Current: ${MAP_TILES[mapTheme].label}. Click to change.`}
            >
                {getThemeIcon()}
            </button>

            {/* GPS Button */}
            <button
                className={styles.gpsButton}
                onClick={handleGetCurrentLocation}
                disabled={loading}
                title="Use my current location"
            >
                {loading ? (
                    <div className={styles.spinner}></div>
                ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                    </svg>
                )}
            </button>
        </div>
    );
}
