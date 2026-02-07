import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Sell.module.css';

const ItemUpload: React.FC = () => {
    const navigate = useNavigate();
    const [images, setImages] = useState<string[]>([]);
    const [viewImage, setViewImage] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [remarks, setRemarks] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [customCategories, setCustomCategories] = useState<string[]>([]);

    const defaultCategories = [
        "เครื่องแก้ว", "เซรามิก", "อุปกรณ์อิเล็กทรอนิกส์", "ของเล่น", "หนังสือ"
    ];

    const availableCategories = [...defaultCategories, ...customCategories];

    const handleAddNewCategory = () => {
        const trimmedName = newCategoryName.trim();
        if (!trimmedName) {
            return;
        }
        if (availableCategories.includes(trimmedName)) {
            alert('This category already exists');
            return;
        }
        setCustomCategories([...customCategories, trimmedName]);
        setCategories([...categories, trimmedName]);
        setNewCategoryName('');
        setShowAddCategory(false);
    };

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
        navigate('/sell/select-address');
    };

    return (
        <div className={styles['post-item-container']}>
            <div className={styles['post-header']}>
                <button className={styles['back-button']} onClick={() => navigate('/home')}>❮</button>
                <span className={styles['header-title']}>Post Item</span>
            </div>

            <div className={styles['scrollable-content']}>
                <div className={styles['section']}>
                    <div className={styles['label-row']}>
                        <span className={styles['main-label']}>Item Photos</span>
                        <span className={styles['tag-required']}>Required</span>
                    </div>
                    <label className={styles['upload-area']}>
                        <input type="file" hidden multiple onChange={handleImageChange} accept="image/*" />
                        <div className={styles['upload-placeholder']}>
                            <div className={styles['icon-up']}>↑</div>
                            <div className={styles['text-orange']}>Upload Photos</div>
                            <div className={styles['text-small']}>Up to 10 images ({images.length}/10)</div>
                        </div>
                    </label>

                    {images.length > 0 && (
                        <div className={styles['thumbnail-grid']}>
                            {images.map((img, index) => (
                                <div key={index} className={styles['thumb-container']}>
                                    <img src={img} className={styles['thumb-item']} onClick={() => setViewImage(img)} alt="preview" />
                                    <button className={styles['remove-thumb']} onClick={() => setImages(images.filter((_, i) => i !== index))}>×</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles['section']}>
                    <span className={styles['main-label']}>Type of Second Hand</span>
                    <div className={styles['form-card']}>
                        <div className={`${styles['tags-wrapper']} ${styles['selected-tags']}`}>
                            {categories.length > 0 ? (
                                categories.map(cat => (
                                    <div key={cat} className={styles['category-chip']}>
                                        {cat} <span className={styles['close-x']} onClick={() => toggleCategory(cat)}>×</span>
                                    </div>
                                ))
                            ) : (
                                <span className={styles['placeholder-text']}>Please select items...</span>
                            )}
                        </div>

                        <div className={styles['category-selection-list']}>
                            {availableCategories.map((cat) => (
                                <div
                                    key={cat}
                                    className={`${styles['category-option']} ${categories.includes(cat) ? styles['selected'] : ''}`}
                                    onClick={() => toggleCategory(cat)}
                                >
                                    {cat}
                                </div>
                            ))}
                            <div
                                className={styles['add-category-btn']}
                                onClick={() => setShowAddCategory(true)}
                            >
                                + Add New
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles['section']}>
                    <span className={styles['main-label']}>Remarks</span>
                    <div className={styles['form-card']}>
                        <textarea
                            className={styles['custom-textarea']}
                            placeholder="Describe condition..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />
                        <div className={styles['char-limit']}>{remarks.length}/300</div>
                    </div>
                </div>
            </div>

            <div className={styles['footer-action']}>
                <button className={styles['btn-next']} onClick={handleNext}>Next ➔</button>
            </div>

            {viewImage && (
                <div className={styles['image-modal']} onClick={() => setViewImage(null)}>
                    <div className={styles['modal-content']}>
                        <img src={viewImage} alt="Full Preview" />
                    </div>
                </div>
            )}

            {showAddCategory && (
                <div className={styles['modal-overlay']} onClick={() => setShowAddCategory(false)}>
                    <div className={styles['add-category-modal']} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles['modal-title']}>Add New Category</h3>
                        <input
                            type="text"
                            className={styles['modal-input']}
                            placeholder="Enter category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()}
                            autoFocus
                        />
                        <p className={styles['modal-subtitle']}>Add a new type of second hand item</p>
                        <div className={styles['modal-actions']}>
                            <button
                                className={styles['modal-btn-cancel']}
                                onClick={() => {
                                    setShowAddCategory(false);
                                    setNewCategoryName('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles['modal-btn-add']}
                                onClick={handleAddNewCategory}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemUpload;
