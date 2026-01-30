import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sell.css';

const ItemUpload: React.FC = () => {
    const navigate = useNavigate();
    const [images, setImages] = useState<string[]>([]);
    const [viewImage, setViewImage] = useState<string | null>(null);
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

    const toggleCategory = (name: string) => {
        if (categories.includes(name)) {
            setCategories(categories.filter(item => item !== name));
        } else {
            setCategories([...categories, name]);
        }
    };

    const handleNext = () => {
        if (images.length === 0) {
            alert('Please upload at least one image');
            return;
        }
        if (categories.length === 0) {
            alert('Please select at least one category');
            return;
        }
        const sellData = { images, categories, remarks, timestamp: new Date().toISOString() };
        localStorage.setItem('sellItemData', JSON.stringify(sellData));
        navigate('/ItemSpecifyLocation');
    };

    return (
        <div className="post-item-container">
            <div className="post-header">
                <button className="back-button" onClick={() => navigate('/home')}>❮</button>
                <span className="header-title">Post Item</span>
            </div>

            <div className="scrollable-content">
                <div className="section">
                    <div className="label-row">
                        <span className="main-label">Item Photos</span>
                        <span className="tag-required">Required</span>
                    </div>
                    <label className="upload-area">
                        <input type="file" hidden multiple onChange={handleImageChange} accept="image/*" />
                        <div className="upload-placeholder">
                            <div className="icon-up">↑</div>
                            <div className="text-orange">Upload Photos</div>
                            <div className="text-small">Up to 10 images ({images.length}/10)</div>
                        </div>
                    </label>

                    {images.length > 0 && (
                        <div className="thumbnail-grid">
                            {images.map((img, index) => (
                                <div key={index} className="thumb-container">
                                    <img src={img} className="thumb-item" onClick={() => setViewImage(img)} alt="preview" />
                                    <button className="remove-thumb" onClick={() => setImages(images.filter((_, i) => i !== index))}>×</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

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
                                    className={`category-option ${categories.includes(cat) ? '' : ''}`}
                                    onClick={() => toggleCategory(cat)}
                                >
                                    {cat} {/* ข้อความจะปรากฏเสมอ */}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="section">
                    <span className="main-label">Remarks</span>
                    <div className="form-card">
                        <textarea 
                            className="custom-textarea" 
                            placeholder="Describe condition..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />
                        <div className="char-limit">{remarks.length}/300</div>
                    </div>
                </div>
            </div>

            <div className="footer-action">
                <button className="btn-next" onClick={handleNext}>Next ➔</button>
            </div>

            {viewImage && (
                <div className="image-modal" onClick={() => setViewImage(null)}>
                    <div className="modal-content">
                        <img src={viewImage} alt="Full Preview" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemUpload;