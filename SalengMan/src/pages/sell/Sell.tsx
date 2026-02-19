import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Sell.module.css';
import { useSell } from '../../context/SellContext';
import PageHeader from '../../components/PageHeader';
import PageFooter from '../../components/PageFooter';
import { analyzeWaste } from '../../services/aiService';

const ItemUpload: React.FC = () => {
    const navigate = useNavigate();
    const { sellData, setImages: setContextImages, setCategories: setContextCategories, setRemarks: setContextRemarks } = useSell();

    const isEditing = sellData.editingPostId !== null;
    const [images, setImages] = useState<string[]>(sellData.images);
    // Keep track of File objects for newly uploaded files
    const [imageFiles, setImageFiles] = useState<(File | null)[]>([]);

    const [viewImage, setViewImage] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>(sellData.categories);
    const [remarks, setRemarks] = useState(sellData.remarks);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [customCategories, setCustomCategories] = useState<string[]>([]);


    const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);

    // Sync with context when returning from other pages
    useEffect(() => {
        if (sellData.images.length > 0) {
            setImages(sellData.images);
            // Initialize imageFiles with nulls for existing images from context
            setImageFiles(new Array(sellData.images.length).fill(null));
        }
        if (sellData.categories.length > 0) setCategories(sellData.categories);
        if (sellData.remarks) setRemarks(sellData.remarks);
    }, []);

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

            // Append new files to our file state
            setImageFiles((prev) => [...prev, ...fileArray]);

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
        // Save to context (in-memory only)
        setContextImages(images);
        setContextCategories(categories);
        setContextRemarks(remarks);
        navigate('/sell/select-address');
    };

    const handleRemoveImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
        setImageFiles(imageFiles.filter((_, i) => i !== index));
    };

    // Helper to convert base64 to File object if needed
    const dataURLtoFile = (dataurl: string, filename: string): File => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };



    const handleAnalyzeAll = async () => {
        if (images.length === 0) return;
        if (isAnalyzingAll) return;

        setIsAnalyzingAll(true);
        const newCategories: string[] = [];
        const newCustomCategories: string[] = [];

        try {
            // Process all images
            const promises = images.map(async (img, index) => {
                let file = imageFiles[index];
                if (!file) {
                    file = dataURLtoFile(img, `image-${index}.jpg`);
                }
                return analyzeWaste(file);
            });

            const results = await Promise.all(promises);

            results.forEach(result => {
                const matchedCategory = availableCategories.find(c =>
                    c.toLowerCase() === result.category.toLowerCase() ||
                    result.category.toLowerCase().includes(c.toLowerCase())
                );

                if (matchedCategory) {
                    if (!newCategories.includes(matchedCategory) && !categories.includes(matchedCategory)) {
                        newCategories.push(matchedCategory);
                    }
                } else {
                    if (result.confidence > 0.8) {
                        if (!newCustomCategories.includes(result.category) && !customCategories.includes(result.category)) {
                            newCustomCategories.push(result.category);
                            if (!newCategories.includes(result.category) && !categories.includes(result.category)) {
                                newCategories.push(result.category);
                            }
                        }
                    }
                }
            });

            if (newCustomCategories.length > 0) {
                setCustomCategories(prev => [...prev, ...newCustomCategories]);
            }
            if (newCategories.length > 0) {
                setCategories(prev => [...prev, ...newCategories]);
                alert(`AI Analyzed ${results.length} images.\nDetected: ${newCategories.join(', ')}`);
            } else {
                alert(`AI Analyzed ${results.length} images.\nNo new categories detected.`);
            }

        } catch (error) {
            console.error("Batch Analysis failed:", error);
            alert("Failed to analyze images.");
        } finally {
            setIsAnalyzingAll(false);
        }
    };

    return (
        <div className={styles['post-item-container']}>
            <PageHeader title={isEditing ? "Edit Post" : "Post Item"} backTo={isEditing ? `/history/${sellData.editingPostId}` : "/home"} />

            <div className={styles['scrollable-content']}>
                <div className={styles['section']}>
                    <div className={styles['label-row']}>
                        <span className={styles['main-label']}>Item Photos</span>
                        <span className={styles['tag-required']}>Required</span>

                        {/* Analyze All Button */}
                        {images.length > 0 && (
                            <button
                                onClick={handleAnalyzeAll}
                                disabled={isAnalyzingAll}
                                style={{
                                    marginLeft: 'auto',
                                    border: '1px solid #ddd',
                                    background: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.85rem',
                                    color: 'var(--orange-button)',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                {isAnalyzingAll ? (
                                    <>
                                        <div className={styles['spinner-mini']} style={{
                                            width: '12px', height: '12px', border: '2px solid #ccc', borderTopColor: '#ff9500', borderRadius: '50%', animation: 'spin 1s linear infinite'
                                        }} />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <span style={{ fontSize: '1.1em' }}>✨</span> Analyze All
                                    </>
                                )}
                            </button>
                        )}
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
                                    <button className={styles['remove-thumb']} onClick={() => handleRemoveImage(index)}>×</button>
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

            <PageFooter title="Next" onClick={handleNext} />

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
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ItemUpload;
