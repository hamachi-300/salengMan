import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useState, useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import './ItemSpecifyLocation.css';

// Fix Marker Icon - แก้ปัญหาหมุดไม่แสดงผลใน React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- ฟังก์ชันช่วยควบคุมกล้องแผนที่ ---
const ChangeView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// --- คอมโพเนนต์จัดการการคลิกบนแผนที่ ---
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click: (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const ItemSpecifyLocation: React.FC = () => {
  const navigate = useNavigate();

  // --- States ---
  const [address, setAddress] = useState('123/45 Muang District, Bangkok 10110');
  const [zipCode, setZipCode] = useState('24140');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number]>([13.7563, 100.5018]);
  const [isSearching, setIsSearching] = useState(false);

  // --- ดึงข้อมูลจาก localStorage ทันทีที่เข้าหน้านี้ ---
  useEffect(() => {
    const savedData = localStorage.getItem('selectedFromSaved');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      
      // อัปเดตช่อง Input
      setAddress(parsedData.address || '');
      setZipCode(parsedData.zipCode || '');
      
      // ล้างข้อมูลทิ้งหลังใช้งาน
      localStorage.removeItem('selectedFromSaved');

      // ค้นหาพิกัดเพื่อเลื่อนแผนที่ตามที่อยู่ที่เลือกมา
      const syncMapFromSaved = async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(parsedData.address)}&limit=1`
          );
          const data = await response.json();
          if (data && data.length > 0) {
            setCoordinates([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          }
        } catch (err) {
          console.error("Sync map error:", err);
        }
      };
      syncMapFromSaved();
    }
  }, []);

  // 1. จิ้มแผนที่ -> ดึงที่อยู่ (Reverse Geocoding)
  const handleMapClick = async (lat: number, lng: number) => {
    setCoordinates([lat, lng]);
    setError('');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=th`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
        if (data.address.postcode) setZipCode(data.address.postcode);
      }
    } catch (err) {
      console.error("Reverse Geocode Error:", err);
    }
  };

  // 2. พิมพ์ที่อยู่ -> เลื่อนหมุด (Geocoding)
  const searchAddress = async () => {
    if (!address.trim()) return;
    setIsSearching(true);
    setError('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setCoordinates([parseFloat(lat), parseFloat(lon)]);
      } else {
        setError('Location not found, please pick on map');
      }
    } catch (err) {
      console.error("Geocode Error:", err);
      setError('Connection error, please try again');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePost = () => {
    if (!address.trim()) {
      setError('Please enter an address');
      return;
    }
    const locationData = { address, zipCode, note, coordinates, timestamp: new Date().toISOString() };
    localStorage.setItem('selectedLocation', JSON.stringify(locationData));
    navigate('/sell'); // กลับไปหน้า Sell
  };

  return (
    <div className="post-item-container">
      {/* Header */}
      <div className="post-header">
        <button className="back-button" onClick={() => navigate('/sell')}>❮</button>
        <span className="header-title">Post Item</span>
      </div>

      <div className="scrollable-content">
        {/* ส่วนที่ 1: แผนที่ */}
        <div className="section">
          <div className="label-row">
            <span className="main-label">Specify Location</span>
            <span className="tag-required">Required</span>
          </div>

          <div className="map-fixed-wrapper">
            <MapContainer center={coordinates} zoom={15} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={coordinates} />
              <MapClickHandler onMapClick={handleMapClick} />
              <ChangeView center={coordinates} />
            </MapContainer>
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="choose-address-btn" onClick={() => navigate('/ItemSelectSaveAddress')}>
              <span>Choose Saved Address</span>
            </button>
          </div>
        </div>

        {/* ส่วนที่ 2: รายละเอียดที่อยู่ */}
        <div className="section">
          <div className="label-row">
            <span className="main-label">Delivery Details</span>
            <button
              className="sync-map-btn"
              onClick={searchAddress}
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Find on Map'}
            </button>
          </div>

          <div className="form-card">
            {error && <div className="error-text-simple">{error}</div>}

            <div className="input-group">
              <p className="text-orange" style={{ fontSize: '12px', marginBottom: '8px' }}>Address</p>
              <textarea
                className="custom-textarea"
                style={{ height: '80px' }}
                value={address}
                onChange={(e) => { setAddress(e.target.value); setError(''); }}
                placeholder="Enter address or tap on map..."
              />
            </div>

            <div className="input-group" style={{ marginTop: '16px' }}>
              <p className="text-orange" style={{ fontSize: '12px', marginBottom: '8px' }}>Zip Code</p>
              <input
                type="text"
                className="custom-textarea"
                style={{ height: '45px' }}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Postcode"
              />
            </div>
          </div>
        </div>

        {/* ส่วนที่ 3: บันทึกเพิ่มเติม */}
        <div className="section">
          <span className="main-label">Note to Driver</span>
          <div className="form-card">
            <input
              type="text"
              className="custom-textarea"
              style={{ height: '45px', border: 'none', background: 'transparent', padding: '0' }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Landmark, house color, phone number..."
            />
          </div>
        </div>
      </div>

      {/* Footer ปุ่ม Post */}
      <div className="footer-action">
        <button className="btn-next" onClick={handlePost}>Post ➔</button>
      </div>
    </div>
  );
};

export default ItemSpecifyLocation;