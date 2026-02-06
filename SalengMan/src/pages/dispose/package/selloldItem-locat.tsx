import "./sell-old-item-locat.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

// รายชื่อจังหวัดทั้งหมดในประเทศไทย (77 จังหวัด)
const THAI_PROVINCES = [
    "Bangkok", "Amnat Charoen", "Ang Thong", "Bueng Kan", "Buriram", "Chachoengsao", "Chai Nat",
    "Chaiyaphum", "Chanthaburi", "Chiang Mai", "Chiang Rai", "Chonburi", "Chumphon", "Kalasin",
    "Kamphaeng Phet", "Kanchanaburi", "Khon Kaen", "Krabi", "Lampang", "Lamphun", "Loei", "Lopburi",
    "Mae Hong Son", "Maha Sarakham", "Mukdahan", "Nakhon Nayok", "Nakhon Pathom", "Nakhon Phanom",
    "Nakhon Ratchasima", "Nakhon Sawan", "Nakhon Si Thammarat", "Nan", "Narathiwat", "Nong Bua Lamphu",
    "Nong Khai", "Nonthaburi", "Pathum Thani", "Pattani", "Phang Nga", "Phatthalung", "Phayao",
    "Phetchabun", "Phetchaburi", "Phichit", "Phitsanulok", "Phra Nakhon Si Ayutthaya", "Phrae",
    "Phuket", "Prachinburi", "Prachuap Khiri Khan", "Ranong", "Ratchaburi", "Rayong", "Roi Et",
    "Sa Kaeo", "Sakon Nakhon", "Samut Prakan", "Samut Sakhon", "Samut Songkhram", "Saraburi",
    "Satun", "Sing Buri", "Sisaket", "Songkhla", "Sukhothai", "Suphan Buri", "Surat Thani", "Surin",
    "Tak", "Trang", "Trat", "Ubon Ratchathani", "Udon Thani", "Uthai Thani", "Uttaradit", "Yala", "Yasothon"
];

function SellOldItemLocat() {
    const navigate = useNavigate();
    const [images, setImages] = useState<(string | ArrayBuffer | null)[]>([]);

    const [formData, setFormData] = useState({
        address: "",
        city: "",
        state: "",
        zipCode: "",
        phone: ""
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
                <button className="back-btn" onClick={() => navigate("/select-package")}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                </button>
                <h1 className="page-title">Post Item (Locat)</h1>
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

                <div className="category-box">
                    {/* Address */}
                    <div className="form-group">
                        <label className="form-label">Address:</label>
                        <input
                            className="category-input"
                            type="text"
                            value={formData.address}
                            onChange={e => handleInputChange('address', e.target.value)}
                        />
                    </div>

                    {/* City */}
                    <div className="form-group">
                        <label className="form-label">City:</label>
                        <input
                            className="category-input"
                            type="text"
                            value={formData.city}
                            onChange={e => handleInputChange('city', e.target.value)}
                        />
                    </div>

                    {/* State (Dropdown with all Thai provinces) */}
                    <div className="form-group">
                        <label className="form-label">State:</label>
                        <select
                            className="category-input category-select"
                            value={formData.state}
                            onChange={e => handleInputChange('state', e.target.value)}
                        >
                            <option value="" disabled>Choose a state</option>
                            {THAI_PROVINCES.map((province) => (
                                <option key={province} value={province}>
                                    {province}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Zip Code */}
                    <div className="form-group">
                        <label className="form-label">Zip Code:</label>
                        <div className="zip-row">
                            <input
                                className="category-input short-input"
                                type="text"
                                value={formData.zipCode}
                                onChange={e => handleInputChange('zipCode', e.target.value)}
                            />
                            <span className="optional-badge">Optional</span>
                        </div>
                    </div>

                    {/* Phone (No Dropdown) */}
                    <div className="form-group">
                        <label className="form-label">Phone:</label>
                        <input
                            className="category-input"
                            type="tel"
                            value={formData.phone}
                            onChange={e => handleInputChange('phone', e.target.value)}
                        />
                        <div className="field-helper">No spaces or dashes</div>
                    </div>

                </div>
            </div>
            <button className="next-btn" onClick={() => navigate("/token-confirm")}>
                Next <span className="arrow">→</span>
            </button>
        </div>
    );
}

export default SellOldItemLocat;
