import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PostTrash.module.css';
import { useTrash } from '../../context/TrashContext';
import PageHeader from '../../components/PageHeader';
import PageFooter from '../../components/PageFooter';
import AlertPopup from '../../components/AlertPopup';
import ConfirmPopup from '../../components/ConfirmPopup';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';
import { useUser } from '../../context/UserContext';

const PostTrash: React.FC = () => {
    const navigate = useNavigate();
    const { trashData, setImages: setContextImages, setCategories: setContextCategories, setRemarks: setContextRemarks, setCoins: setContextCoins, setBags: setContextBags } = useTrash();

    const isEditing = trashData.editingPostId !== null;
    const [images, setImages] = useState<string[]>(trashData.images);
    const [viewImage, setViewImage] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>(trashData.categories);
    const [coins, setCoins] = useState(trashData.coins || 1);
    const [bags, setBags] = useState(trashData.bags || 1);
    const [remarks, setRemarks] = useState(trashData.remarks);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [showPhotoOptions, setShowPhotoOptions] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [userCoins, setUserCoins] = useState<number | null>(null);
    const [showCoinPopup, setShowCoinPopup] = useState(false);
    const { user } = useUser();

    // Sync with context when returning from other pages
    useEffect(() => {
        if (trashData.images.length > 0) setImages(trashData.images);
        if (trashData.categories.length > 0) setCategories(trashData.categories);
        if (trashData.remarks) setRemarks(trashData.remarks);
        if (trashData.coins) setCoins(trashData.coins);
        if (trashData.bags) setBags(trashData.bags);

        fetchUserCoins();
    }, [user]);

    const fetchUserCoins = async () => {
        const token = getToken();
        if (!token) return;
        try {
            const data = await api.getCoinBalance(token);
            setUserCoins(data.balance);
        } catch (error) {
            console.error('Failed to fetch coins:', error);
        }
    };

    // Logic for coins and bags: 1 coin limits 3 bags
    const handleBagsChange = (newBags: number) => {
        const clampedBags = Math.min(6, Math.max(1, newBags));
        setBags(clampedBags);
        // Automatically calculate coins needed: 1 coin for 1-3 bags, 2 coins for 4-6 bags
        const neededCoins = Math.ceil(clampedBags / 3);
        setCoins(neededCoins);
    };

    const defaultCategories = [
        "ขยะทั่วไป", "ขยะรีไซเคิล", "ขยะเปียก", "ขยะอันตราย", "พลาสติก", "กระดาษ", "แก้ว", "โลหะ"
    ];

    const availableCategories = [...defaultCategories, ...customCategories];

    const handleAddNewCategory = () => {
        const trimmedName = newCategoryName.trim();
        if (!trimmedName) {
            return;
        }
        if (availableCategories.includes(trimmedName)) {
            setAlertMessage('This category already exists');
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
                setAlertMessage("You can only upload up to 10 images.");
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



    const handleNext = () => {
        if (images.length === 0) {
            setAlertMessage('Please upload at least one image');
            return;
        }

        // Check coins
        if (userCoins !== null && userCoins < coins) {
            setShowCoinPopup(true);
            return;
        }

        // Save to context (in-memory only)
        setContextImages(images);
        setContextCategories(categories);
        setContextRemarks(remarks);
        setContextCoins(coins);
        setContextBags(bags);
        navigate('/trash/select-address');
    };

    return (
        <div className={styles['post-item-container']}>
            <PageHeader title={isEditing ? "Edit Trash Post" : "Post Trash"} backTo={isEditing ? `/history/${trashData.editingPostId}` : "/home"} />

            <div className={styles['scrollable-content']}>
                <div className={styles['section']}>
                    <div className={styles['label-row']}>
                        <span className={styles['main-label']}>Trash Photos</span>
                        <span className={styles['tag-required']}>Required</span>
                    </div>
                    {/* Hidden inputs for camera and gallery */}
                    <input id="camera-upload" type="file" hidden accept="image/*" capture="environment" onChange={(e) => { handleImageChange(e); setShowPhotoOptions(false); }} />
                    <input id="gallery-upload" type="file" hidden multiple accept="image/*" onChange={(e) => { handleImageChange(e); setShowPhotoOptions(false); }} />

                    <div className={styles['upload-area']} onClick={() => setShowPhotoOptions(true)}>
                        <div className={styles['upload-placeholder']}>
                            <div className={styles['icon-up']}>+</div>
                            <div className={styles['text-orange']}>Add Photos</div>
                            <div className={styles['text-small']}>Take photo or upload from gallery</div>
                        </div>
                    </div>

                    <div className={styles['image-count-status']} style={{ textAlign: 'center', marginTop: '12px', display: 'block', background: 'transparent', color: '#888' }}>
                        Up to 10 images ({images.length}/10)
                    </div>

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
                    <span className={styles['main-label']}>Number of Bags</span>
                    <div className={styles['counter-container']}>
                        <span className={styles['counter-label']}>Standard Bags (max 6)</span>
                        <div className={styles['counter-controls']}>
                            <button 
                                className={styles['counter-button']} 
                                onClick={() => handleBagsChange(bags - 1)}
                                disabled={bags <= 1}
                            >
                                -
                            </button>
                            <span className={styles['counter-value']}>{bags}</span>
                            <button 
                                className={styles['counter-button']} 
                                onClick={() => handleBagsChange(bags + 1)}
                                disabled={bags >= 6}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <span className={styles['main-label']} style={{ marginTop: '20px', display: 'block' }}>Number of Coins</span>
                    <div className={styles['counter-container']}>
                        <span className={styles['counter-label']}>Coins Used</span>
                        <div className={styles['counter-controls']}>
                            <span className={styles['counter-value']} style={{ marginRight: '10px' }}>{coins} / 2</span>
                        </div>
                    </div>
                    
                    <div className={styles['coin-summary']}>
                        <div className={styles['coin-icon']}>🪙</div>
                        <div className={styles['coin-info']}>
                            <div className={styles['coin-info-title']}>{coins} Coin{coins > 1 ? 's' : ''} applied</div>
                            <div className={styles['coin-info-desc']}>1 coin covers up to 3 bags. You have {bags} bag{bags > 1 ? 's' : ''}.</div>
                        </div>
                    </div>
                </div>

                <div className={styles['section']}>
                    <span className={styles['main-label']}>Remarks</span>
                    <div className={styles['form-card']}>
                        <textarea
                            className={styles['custom-textarea']}
                            placeholder="Describe your trash (e.g. how many bags, weight)..."
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
                        <h3 className={styles['modal-title']}>Add New Categoray</h3>
                        <input
                            type="text"
                            className={styles['modal-input']}
                            placeholder="Enter category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()}
                            autoFocus
                        />
                        <p className={styles['modal-subtitle']}>Add a new type of trash</p>
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

            {showPhotoOptions && (
                <div className={styles['modal-overlay']} onClick={() => setShowPhotoOptions(false)}>
                    <div className={styles['photo-options-modal']} onClick={(e) => e.stopPropagation()}>
                        <div className={styles['photo-options-header']}>
                            <h3 className={styles['modal-title']} style={{ margin: 0 }}>Add Photos</h3>
                            <button className={styles['close-btn']} onClick={() => setShowPhotoOptions(false)}>×</button>
                        </div>
                        <div className={styles['photo-options-list']}>
                            <label htmlFor="camera-upload" className={styles['photo-option-btn']}>
                                <div className={styles['photo-option-icon']}>📷</div>
                                <div className={styles['photo-option-text']}>
                                    <div className={styles['photo-option-title']}>Take Photo</div>
                                    <div className={styles['photo-option-desc']}>Use your camera to snap a photo</div>
                                </div>
                            </label>
                            <label htmlFor="gallery-upload" className={styles['photo-option-btn']}>
                                <div className={styles['photo-option-icon']}>🖼️</div>
                                <div className={styles['photo-option-text']}>
                                    <div className={styles['photo-option-title']}>Choose from Gallery</div>
                                    <div className={styles['photo-option-desc']}>Select existing photos from your device</div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            <AlertPopup
                isOpen={alertMessage !== null}
                message={alertMessage || ""}
                onClose={() => setAlertMessage(null)}
            />

            <ConfirmPopup 
                isOpen={showCoinPopup}
                title="Not Enough Coins"
                message={`You need ${coins} coin${coins > 1 ? 's' : ''} to post ${bags} bag${bags > 1 ? 's' : ''}. Your current balance is ${userCoins || 0} coin${userCoins === 1 ? '' : 's'}. Would you like to buy more?`}
                confirmText="Buy Coins"
                cancelText="Cancel"
                onConfirm={() => navigate('/coin')}
                onCancel={() => setShowCoinPopup(false)}
            />
        </div>
    );
};

export default PostTrash;
