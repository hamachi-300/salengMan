import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../sell/Sell.module.css";
import { useTrash } from "../../context/TrashContext";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";

function TrashDetails() {
    const navigate = useNavigate();
    const { trashData, setImages, setBagCount, setCoins, setRemarks } = useTrash();
    const [viewImage, setViewImage] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const currentCount = trashData.images.length;
        const remaining = 10 - currentCount;
        const newFiles = Array.from(files).slice(0, remaining);

        newFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages([...trashData.images, reader.result as string].slice(0, 10));
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemoveImage = (index: number) => {
        setImages(trashData.images.filter((_, i) => i !== index));
    };

    const handleNext = () => {
        if (trashData.images.length === 0) {
            alert("Please upload at least one photo.");
            return;
        }
        navigate('/trash/select-address');
    };

    return (
        <div className={styles['page']}>
            <PageHeader title="Post Trash" backTo="/trash/mode" />

            <div className={styles['scrollable-content']}>
                {/* Image Section */}
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
                            <div className={styles['text-small']}>Up to 10 images ({trashData.images.length}/10)</div>
                        </div>
                    </label>

                    {trashData.images.length > 0 && (
                        <div className={styles['thumbnail-grid']}>
                            {trashData.images.map((img, index) => (
                                <div key={index} className={styles['thumb-container']}>
                                    <img
                                        src={img}
                                        className={styles['thumb-item']}
                                        onClick={() => setViewImage(img)}
                                        alt="preview"
                                    />
                                    <button className={styles['remove-thumb']} onClick={() => handleRemoveImage(index)}>×</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Coin Stepper */}
                <div className={styles['section']}>
                    <div className={styles['stepper-section']}>
                        <label className={styles['stepper-label']}>Incentive Coins</label>
                        <div className={styles['stepper-row']}>
                            <button
                                className={styles['stepper-btn']}
                                style={{ backgroundColor: '#FF9800', color: 'white', border: 'none' }}
                                onClick={() => {
                                    const nextCoins = Math.max(1, trashData.coins - 1);
                                    setCoins(nextCoins);
                                    // Clamp bags if coin decreases
                                    if (trashData.bagCount > nextCoins * 3) {
                                        setBagCount(nextCoins * 3);
                                    }
                                }}
                            >
                                -
                            </button>
                            <span className={styles['stepper-value']} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#FF9800' }}>🪙</span> {trashData.coins}
                            </span>
                            <button
                                className={styles['stepper-btn']}
                                style={{ backgroundColor: '#FF9800', color: 'white', border: 'none' }}
                                onClick={() => {
                                    const neededCoins = Math.ceil(trashData.bagCount / 3);
                                    if (trashData.coins >= neededCoins && trashData.coins < 2) {
                                        alert("Please add more bags to increase coins (1 coin per 3 bags).");
                                    } else {
                                        setCoins(Math.min(2, trashData.coins + 1));
                                    }
                                }}
                            >
                                +
                            </button>
                        </div>
                        <p style={{ fontSize: '11px', color: '#666', marginTop: '8px', textAlign: 'center' }}>Max: 2 coins (1 coin per 3 bags)</p>
                    </div>
                </div>

                {/* Bag Count Stepper */}
                <div className={styles['section']}>
                    <div className={styles['stepper-section']}>
                        <label className={styles['stepper-label']}>Number of Bags</label>
                        <div className={styles['stepper-row']}>
                            <button
                                className={styles['stepper-btn']}
                                onClick={() => {
                                    const nextBags = Math.max(1, trashData.bagCount - 1);
                                    setBagCount(nextBags);
                                    // Auto-decrease coins if they drop into a lower tier
                                    const neededCoins = Math.ceil(nextBags / 3);
                                    if (trashData.coins > neededCoins) {
                                        setCoins(neededCoins);
                                    }
                                }}
                            >
                                -
                            </button>
                            <span className={styles['stepper-value']}>{trashData.bagCount}</span>
                            <button
                                className={styles['stepper-btn']}
                                onClick={() => {
                                    if (trashData.bagCount >= 6) {
                                        alert("Maximum is 6 bags (Requires 2 coins).");
                                        return;
                                    }
                                    const nextBags = trashData.bagCount + 1;
                                    setBagCount(nextBags);
                                    // Auto-increase coins if they cross into a new tier
                                    const neededCoins = Math.ceil(nextBags / 3);
                                    if (neededCoins > trashData.coins) {
                                        setCoins(neededCoins);
                                    }
                                }}
                            >
                                +
                            </button>
                        </div>
                        <p style={{ fontSize: '11px', color: '#666', marginTop: '8px', textAlign: 'center' }}>Limit: 6 bags for current incentive</p>
                    </div>
                </div>

                {/* Remarks */}
                <div className={styles['section']}>
                    <span className={styles['main-label']}>Remarks (Optional)</span>
                    <div className={styles['form-card']}>
                        <textarea
                            className={styles['custom-textarea']}
                            placeholder="E.g., Large furniture, items are outside..."
                            value={trashData.remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />
                        <div className={styles['char-limit']}>{trashData.remarks.length}/300</div>
                    </div>
                </div>
            </div>

            <PageFooter title="Next: Select Address" onClick={handleNext} />

            {/* Image Modal Preview */}
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

export default TrashDetails;
