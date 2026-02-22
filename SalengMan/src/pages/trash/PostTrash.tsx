import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../sell/Sell.module.css";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";

const PostTrash: React.FC = () => {
    const navigate = useNavigate();
    const [images, setImages] = useState<string[]>([]);
    const [coins, setCoins] = useState<number>(1);
    const [amount, setAmount] = useState<number>(1);
    const [remarks, setRemarks] = useState<string>("");
    const [viewImage, setViewImage] = useState<string | null>(null);

    // Sync amount when coins change to ensure it doesn't exceed 3 * coins
    useEffect(() => {
        const maxAmount = coins * 3;
        if (amount > maxAmount) {
            setAmount(maxAmount);
        }
    }, [coins, amount]);

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

    const handleDispose = () => {
        if (images.length === 0) {
            alert("Please upload at least one image.");
            return;
        }
        if (!remarks.trim()) {
            alert("Please enter remarks.");
            return;
        }
        // TODO: Implement API call
        console.log("Disposing trash:", { images, coins, amount, remarks });
        alert("Trash post created successfully!");
        navigate("/home");
    };

    const incrementCoins = () => {
        if (coins < 2) setCoins(coins + 1);
    };

    const decrementCoins = () => {
        if (coins > 1) setCoins(coins - 1);
    };

    const incrementAmount = () => {
        if (amount < coins * 3) setAmount(amount + 1);
    };

    const decrementAmount = () => {
        if (amount > 1) setAmount(amount - 1);
    };

    return (
        <div className={styles['post-item-container']}>
            <PageHeader
                title="" // Wireframe has no title, or maybe implicit. Keeping empty for now or ""
                backTo="/home"
                rightElement={<span className={styles['location-text']}>Location ---</span>}
            />

            <div className={styles['scrollable-content']}>
                {/* Image Upload Section */}
                <div className={styles['section']}>
                    <label className={styles['upload-area']}>
                        <input type="file" hidden multiple onChange={handleImageChange} accept="image/*" />
                        <div className={styles['upload-placeholder']}>
                            <div className={styles['icon-up']}>↑</div>
                            <div className={styles['text-orange']}>Upload Photos</div>
                            <div className={styles['text-small']}>Up to 10 images ({images.length}/10)</div>
                        </div>
                    </label>

                    {/* Thumbnail Grid */}
                    {images.length > 0 && (
                        <div className={styles['thumbnail-grid']}>
                            {images.map((img, index) => (
                                <div key={index} className={styles['thumb-container']}>
                                    <img
                                        src={img}
                                        className={styles['thumb-item']}
                                        onClick={(e) => { e.preventDefault(); setViewImage(img); }}
                                        alt={`preview-${index}`}
                                    />
                                    <button
                                        className={styles['remove-thumb']}
                                        onClick={(e) => { e.preventDefault(); setImages(images.filter((_, i) => i !== index)); }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Coins Stepper */}
                <div className={styles['stepper-section']}>
                    <div className={styles['stepper-label']}>Coins</div>
                    <div className={styles['stepper-row']}>
                        <button
                            className={styles['stepper-btn']}
                            onClick={decrementCoins}
                            disabled={coins <= 1}
                        >
                            -
                        </button>
                        <div className={styles['stepper-value']}>{coins}</div>
                        <button
                            className={styles['stepper-btn']}
                            onClick={incrementCoins}
                            disabled={coins >= 2}
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Amount Stepper */}
                <div className={styles['stepper-section']}>
                    <div className={styles['stepper-label']}>Amount</div>
                    <div className={styles['stepper-row']}>
                        <button
                            className={styles['stepper-btn']}
                            onClick={decrementAmount}
                            disabled={amount <= 1}
                        >
                            -
                        </button>
                        <div className={styles['stepper-value']}>{amount} / {coins * 3}</div>
                        <button
                            className={styles['stepper-btn']}
                            onClick={incrementAmount}
                            disabled={amount >= coins * 3}
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Remarks Section */}
                <div className={styles['section']}>
                    <div className={styles['main-label']} style={{ fontSize: '14px', marginBottom: '8px' }}>* กรุณาระบุ Remarks</div>
                    <div className={styles['form-card']} style={{ marginTop: '0' }}>
                        <textarea
                            className={styles['custom-textarea']}
                            placeholder=""
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <PageFooter title="Dispose" onClick={handleDispose} />

            {/* Image Modal */}
            {viewImage && (
                <div className={styles['image-modal']} onClick={() => setViewImage(null)}>
                    <div className={styles['modal-content']}>
                        <img src={viewImage} alt="Full Preview" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default PostTrash;
