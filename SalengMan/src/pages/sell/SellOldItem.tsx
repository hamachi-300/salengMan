
import "./SellOldItem.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import AddressDisplay from "../../components/Address/AddressDisplay";
import { Address } from "../../types/address";

function SellOldItem() {
  const navigate = useNavigate();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [images, setImages] = useState<(string | ArrayBuffer | null)[]>([]);

  const [formData, setFormData] = useState({
    note: ""
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setImages(prev => [...prev, ev.target?.result || null]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/selectpackage")}>
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
          <label className="upload-label">
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
            <div className="upload-area small-upload-area">
              <div className="upload-icon">↑</div>
              <div className="upload-text-main">Upload Photos</div>
              <div className="upload-text-sub">Tap here to add images</div>
            </div>
          </label>
          <div className="image-slots-row">
            {[0, 1, 2].map(idx => (
              <div className="image-slot" key={idx}>
                {images[idx] ? <img src={images[idx]?.toString()} alt="uploaded" className="preview-img" /> : (idx + 1)}
              </div>
            ))}
            <div className="image-slot add-slot">+</div>
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

      </div>

      <div className="bottom-actions">
        <button className="action-btn amount-btn" onClick={() => console.log("Amount clicked")}>
          ระบุจำนวน (Amount)
        </button>
        <button className="action-btn submit-btn" onClick={() => {
          console.log({ ...formData, selectedAddress, images });
          // Submit logic here
        }}>
          ยืนยัน (Submit Post)
        </button>
      </div>
    </div>
  );
}

export default SellOldItem;