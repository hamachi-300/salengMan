import "./SellOldItem.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react"; // เพิ่ม useEffect เพื่อใช้ re-render เวลาได้

import AddressDisplay from "../../components/Address/AddressDisplay";
import { Address } from "../../types/address";

function SellOldItem() {
  const navigate = useNavigate();
  const handleBack = () => navigate("/select-package");

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [images, setImages] = useState<(string | ArrayBuffer | null)[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    note: ""
  });

  // สร้าง Array เวลา 08:00 - 23:00
  const timeSlots = Array.from({ length: 16 }, (_, i) => {
    const hour = 8 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // --- ฟังก์ชันเช็คเวลา (Logic 2 ชั่วโมง) ---
  const isTimeDisabled = (timeStr: string) => {
    const now = new Date(); // เวลาปัจจุบัน (Timezone เครื่อง)

    // สร้าง Date Object ของ Slot เวลาที่จะเช็ค (โดยใช้วันที่ปัจจุบัน)
    const [slotHour, slotMinute] = timeStr.split(':').map(Number);
    const slotDate = new Date();
    slotDate.setHours(slotHour, slotMinute, 0, 0);

    // เวลาขั้นต่ำที่จองได้ = เวลาปัจจุบัน + 2 ชั่วโมง
    const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // ถ้าเวลาของ Slot น้อยกว่า เวลาขั้นต่ำ -> ให้ Disable
    return slotDate < minBookingTime;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setImages(prev => {
            if (prev.length >= 10) return prev;
            return [...prev, ev.target?.result || null];
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={handleBack}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className="page-title">Post Item</h1>
      </div>
      <div className="sell-content">

        {/* Photos Section */}
        <div className="section-label-row">
          <span className="section-label">Item Photos</span>
          <span className="required-label">Required</span>
        </div>
        <div className="upload-photo-box">
          <label className="upload-label" htmlFor="image-upload-input">
            <input
              id="image-upload-input"
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <div className="upload-area small-upload-area" style={images.length > 0 ? { padding: 0, overflow: 'hidden', border: 'none' } : {}}>
              {images.length > 0 ? (
                <img
                  src={images[0]?.toString()}
                  alt="Main Display"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }}
                />
              ) : (
                <>
                  <div className="upload-icon">↑</div>
                  <div className="upload-text-main">Upload Photos</div>
                  <div className="upload-text-sub">Tap here to add images</div>
                </>
              )}
            </div>
          </label>
          <div className="image-slots-row">
            {images.map((imgSrc, idx) => (
              <div className="image-slot" key={idx}>
                <img src={imgSrc?.toString()} alt={`uploaded-${idx}`} className="preview-img" />
              </div>
            ))}
            {images.length < 10 && (
              <label className="image-slot add-slot" htmlFor="image-upload-input">
                +
              </label>
            )}
          </div>
          <div className="photo-note">
            หมายเหตุ<br />
            <span style={{ fontSize: '0.97rem', color: '#666', fontFamily: 'var(--font-family)' }}>
              ทิ้งได้เฉพาะถุงขยะดำ 3 ถุงต่อ 1 token
            </span>
          </div>
        </div>

        {/* Location Section */}
        <div className="section-label-row" style={{ marginTop: 32 }}>
          <span className="section-label">Location</span>
        </div>

        <div style={{ marginTop: "16px" }}>
          <AddressDisplay
            address={selectedAddress}
            onAddressChange={setSelectedAddress}
          />
        </div>

        {/* Schedule Pickup */}
        <div className="section-label-row" style={{ marginTop: 32 }}>
          <span className="section-label">Schedule Pickup</span>
        </div>

        <div className="schedule-grid">
          {timeSlots.map((time) => {
            const disabled = isTimeDisabled(time); // เช็คสถานะ disable
            return (
              <button
                key={time}
                disabled={disabled} // ใส่ attribute disabled
                className={`time-slot-btn ${selectedTime === time ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setSelectedTime(time)}
              >
                {time}
              </button>
            );
          })}
        </div>

      </div>

      <div className="bottom-actions">
        <button className="action-btn amount-btn" onClick={() => navigate("/token-confirm")}>
          ระบุจำนวน (Amount)
        </button>
        <button className="action-btn submit-btn" onClick={() => {
          console.log({ ...formData, selectedAddress, images, selectedTime });
        }}>
          ยืนยัน (Submit Post)
        </button>
      </div>
    </div>
  );
}

export default SellOldItem;