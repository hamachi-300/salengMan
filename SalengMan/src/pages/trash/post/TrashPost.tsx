import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TrashPost.module.css';
import PageHeader from '../../../components/PageHeader';
import PageFooter from '../../../components/PageFooter';

const TrashPost: React.FC = () => {
    const navigate = useNavigate();

    const [images, setImages] = useState<string[]>([]);
    const [viewImage, setViewImage] = useState<string | null>(null);
    const [coinAmount, setCoinAmount] = useState(1);
    const [remarks, setRemarks] = useState('');

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

    const handleCoinDecrement = () => {
        if (coinAmount > 1) {
            setCoinAmount(coinAmount - 1);
        }
    };

    const handleCoinIncrement = () => {
        if (coinAmount < 2) {
            setCoinAmount(coinAmount + 1);
        }
    };

    const handleNext = () => {
        if (images.length === 0) {
            alert('Please upload at least one image');
            return;
        }

        // In a real app, we would save this data to context or backend here
        // For now, we'll just log it and show an alert since there is no next page yet
        console.log("Submitting trash pickup request:", { images, coinAmount, remarks });
        alert("Pickup request received! (Demo)");
        navigate('/trash');
    };

    return (
        <div className={styles['post-item-container']}>
            <PageHeader title="Schedule Pickup" backTo="/trash" />

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
                    <span className={styles['main-label']}>Select amount of coins</span>
                    <div className={styles['form-card']}>
                        <div className={styles['coin-stepper-container']}>
                            <div className={styles['coin-stepper']}>
                                <button
                                    className={styles['stepper-btn']}
                                    onClick={handleCoinDecrement}
                                    disabled={coinAmount <= 1}
                                >
                                    –
                                </button>
                                <div className={styles['stepper-value']}>
                                    {coinAmount}
                                </div>
                                <button
                                    className={styles['stepper-btn']}
                                    onClick={handleCoinIncrement}
                                    disabled={coinAmount >= 2}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles['section']}>
                    <span className={styles['main-label']}>Remarks</span>
                    <div className={styles['form-card']}>
                        <textarea
                            className={styles['custom-textarea']}
                            placeholder="Describe waste condition or special instructions..."
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
        </div>
    );
};

export default TrashPost;
