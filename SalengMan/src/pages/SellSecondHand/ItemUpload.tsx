import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ItemUpload.css';

const ItemUpload: React.FC = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState<string[]>([]); // เก็บรูปที่เลือกแล้ว
  const [viewImage, setViewImage] = useState<string | null>(null); // สำหรับดูรูปขยาย
  const [categories, setCategories] = useState<string[]>([]);
  const [remarks, setRemarks] = useState('');

  const availableCategories = [
    "Steel", "Aluminum", "Copper", "Brass", "Stainless Steel", "Lead", "Alloy Wheel",
    "PET Bottle", "Colored Bottle", "Clear/Opaque Plastic", "Plastic Bag", "Industrial Plastic",
    "Newspaper", "White/Black Paper", "Cardboard", "Hard Paper", "Brochure",
    "Glass Bottle", "Glass Scraps",
    "Monitor", "Computer Case", "Fan", "Television", "Printer",
    "Tire", "Fabric Scraps", "Light Bulb", "Used Cooking Oil", "Car Battery", "Others"
  ];

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      
      // ตรวจสอบว่ารวมของเก่ากับของใหม่ต้องไม่เกิน 10 รูป
      if (images.length + fileArray.length > 10) {
        alert("You can only upload up to 10 images.");
        return;
      }

      const newImagePromises = fileArray.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(newImagePromises).then((base64Images) => {
        setImages((prev) => [...prev, ...base64Images]);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    if (viewImage === images[index]) setViewImage(null);
  };

  const toggleCategory = (name: string) => {
    if (categories.includes(name)) {
      setCategories(categories.filter(item => item !== name));
    } else {
      setCategories([...categories, name]);
    }
  };

  return (
    <div className="post-item-container">
      <div className="post-header">
        <button className="back-button" onClick={() => navigate(-1)}>❮</button>
        <span className="header-title">Post Item</span>
      </div>

      <div className="scrollable-content">
        {/* Section: Upload Area */}
        <div className="section">
          <div className="label-row">
            <span className="main-label">Item Photos</span>
            <span className="tag-required">Required</span>
          </div>
          
          {/* ช่องอัปโหลดหลัก */}
          <label className="upload-area">
            <input 
              type="file" 
              hidden 
              multiple 
              onChange={handleImageChange} 
              accept="image/*" 
              disabled={images.length >= 10}
            />
            <div className="upload-placeholder">
              <div className="icon-up">↑</div>
              <div className="text-orange">Upload Photos</div>
              <div className="text-small">You can upload up to 10 images</div>
              <div className="image-count-status">{images.length} / 10</div>
            </div>
          </label>

          {/* ส่วนแสดงรูปเล็ก (Thumbnails) */}
          {images.length > 0 && (
            <div className="thumbnail-grid">
              {images.map((img, index) => (
                <div key={index} className="thumb-container">
                  <img 
                    src={img} 
                    alt="preview" 
                    className="thumb-item" 
                    onClick={() => setViewImage(img)} // คลิกดูรูปใหญ่
                  />
                  <button className="remove-thumb" onClick={() => removeImage(index)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal สำหรับดูรูปขยาย (Light Box) */}
        {viewImage && (
          <div className="image-modal" onClick={() => setViewImage(null)}>
            <div className="modal-content">
              <img src={viewImage} alt="Full Preview" />
              <p>Tap anywhere to close</p>
            </div>
          </div>
        )}

        {/* Section: Category Selection */}
        <div className="section">
          <span className="main-label">Type of Second Hand</span>
          <div className="form-card">
            <div className="tags-wrapper selected-tags">
              {categories.length > 0 ? (
                categories.map(cat => (
                  <div key={cat} className="category-chip">
                    {cat} <span className="close-x" onClick={() => toggleCategory(cat)}>×</span>
                  </div>
                ))
              ) : (
                <span className="placeholder-text">Please select items...</span>
              )}
            </div>
            <div className="category-selection-list">
              {availableCategories.map((cat) => (
                <div 
                  key={cat} 
                  className={`category-option ${categories.includes(cat) ? 'selected' : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section: Remarks */}
        <div className="section">
          <span className="main-label">Remarks</span>
          <div className="form-card">
            <textarea 
              className="custom-textarea" 
              placeholder="Describe condition..."
              value={remarks}
              maxLength={300}
              onChange={(e) => setRemarks(e.target.value)}
            ></textarea>
            <div className="char-limit">{remarks.length}/300</div>
          </div>
        </div>
      </div>

      <div className="footer-action">
        <button className="btn-next">Next ➔</button>
      </div>
    </div>
  );
};

export default ItemUpload;