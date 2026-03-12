import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './EsgTaskMonitor.module.css';
import PageHeader from '../../components/PageHeader';
import PageFooter from '../../components/PageFooter';
import profileLogo from '../../assets/icon/profile.svg';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';
import { useUser } from '../../context/UserContext';
import AlertPopup from '../../components/AlertPopup';

const EsgTaskMonitor: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { currentLocation } = useUser();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [distance, setDistance] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coinsEarned, setCoinsEarned] = useState<number | null>(null);
    const [completedWeight, setCompletedWeight] = useState<number | null>(null);

    // Image states
    const [evidenceImages, setEvidenceImages] = useState<(string | null)[]>([null, null, null]);
    const [receiptImage, setReceiptImage] = useState<string | null>(null);

    // Photo options modal states
    const [showPhotoOptions, setShowPhotoOptions] = useState(false);
    const [activePhotoSlot, setActivePhotoSlot] = useState<{ index: number; type: 'evidence' | 'receipt' } | null>(null);

    useEffect(() => {
        fetchTaskDetails();

        // Clear cached trash info
        const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('trash_info_'));
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }, [id]);

    useEffect(() => {
        if (currentLocation && task?.factory_lat && task?.factory_lng) {
            const dist = calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                parseFloat(task.factory_lat),
                parseFloat(task.factory_lng)
            );
            setDistance(dist);
        }
    }, [currentLocation, task]);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in metres
    };

    const fetchTaskDetails = async () => {
        const token = getToken();
        if (!token || !id) return;
        try {
            const data = await api.getEsgTaskById(token, id);
            setTask(data.task);
        } catch (error) {
            console.error("Failed to fetch task details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (type: 'evidence' | 'receipt', slotIndex?: number) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);
        const newImagePromises = fileArray.map((file) => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
            });
        });

        const base64Images = await Promise.all(newImagePromises);

        if (type === 'evidence') {
            if (slotIndex !== undefined) {
                // Replacement logic if needed, but for append-style we'll mostly append
                const newImages = [...evidenceImages.filter(img => img !== null)];
                newImages.push(...base64Images);
                setEvidenceImages(newImages);
            } else {
                setEvidenceImages(prev => {
                    const filtered = prev.filter(img => img !== null) as string[];
                    return [...filtered, ...base64Images];
                });
            }
        } else {
            setReceiptImage(base64Images[0]);
        }
        setShowPhotoOptions(false);
        // Reset input value so same file can be selected again
        e.target.value = '';
    };

    const triggerUpload = (source: 'camera' | 'gallery') => {
        const id = source === 'camera' ? 'camera-upload' : 'gallery-upload';
        document.getElementById(id)?.click();
    };

    const removeImage = (index: number, type: 'evidence' | 'receipt') => {
        if (type === 'evidence') {
            setEvidenceImages(prev => prev.filter((_, i) => i !== index));
        } else {
            setReceiptImage(null);
        }
    };

    const handleFinalizeTask = async () => {
        if (!task || isSubmitting) return;

        const validEvidences = evidenceImages.filter(img => img !== null) as string[];
        if (validEvidences.length < 3) {
            setError("กรุณาอัปโหลดรูปถ่ายตอนส่งอย่างน้อย 3 รูป");
            return;
        }
        if (!receiptImage) {
            setError("กรุณาอัปโหลดรูปถ่ายใบเสร็จ");
            return;
        }
        if (distance === null || distance > 300) {
            setError("คุณต้องอยู่ในระยะ 300 เมตรจากโรงงานรีไซเคิล");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const token = getToken();
            if (!token) throw new Error("No authentication token found");

            const result = await api.finalizeEsgTask(token, id!, {
                evidences_images: validEvidences,
                receipt_images: [receiptImage]
            });

            if (result.success) {
                setCoinsEarned(result.coinsEarned || 0);
                setCompletedWeight(result.totalWeight || 0);
                setShowSuccess(true);
            }
        } catch (err: any) {
            console.error("Failed to finalize task", err);
            setError(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openInternalMap = () => {
        if (task?.factory_lat && task?.factory_lng) {
            navigate(`/esg/task-explore/${id}?mode=factory`);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <PageHeader title="Task Monitor" onBack={() => navigate('/esg/today_tasks')} />
                <div className={styles.loading}>กำลังโหลด...</div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className={styles.container}>
                <PageHeader title="Task Monitor" onBack={() => navigate('/esg/today_tasks')} />
                <div className={styles.empty}>ไม่พบข้อมูลงาน</div>
            </div>
        );
    }

    const isCompleted = task.status === 'complete' || task.status === 'completed';
    const isInRadius = distance !== null && distance <= 300;
    const uploadedEvidenceCount = evidenceImages.filter(img => img !== null).length;
    const isReadyToComplete = isInRadius && uploadedEvidenceCount >= 3 && receiptImage !== null;

    return (
        <div className={styles.container}>
            <PageHeader title="Task Monitor" />

            <div className={`${styles.content} ${isCompleted ? styles.completedContent : ''}`}>
                {/* Status Timeline */}
                <div className={styles.timelineSection}>
                    <span className={styles.sectionLabel}>TRASH PROGRESS</span>
                    <div className={styles.timeline}>
                        {[
                            { status: 'waiting', label: 'Waiting', icon: '📅' },
                            { status: 'pending', label: 'Pending', icon: '🚚' },
                            { status: 'complete', label: 'Completed', icon: '✅' }
                        ].map((step, index) => {
                            const statuses = ['waiting', 'pending', 'complete'];
                            let currentStatus = task.status;
                            if (currentStatus === 'completed' || currentStatus === 'complete') currentStatus = 'complete';
                            if (currentStatus === 'in-progress') currentStatus = 'pending';

                            const currentIndex = statuses.indexOf(currentStatus) === -1 ? 0 : statuses.indexOf(currentStatus);
                            const isActive = index <= currentIndex;
                            const isCurrent = index === currentIndex;

                            return (
                                <div key={step.status} className={`${styles.timelineStep} ${isActive ? styles.activeStep : ''} ${isCurrent ? styles.currentStep : ''}`}>
                                    <div className={styles.stepIcon}>{step.icon}</div>
                                    <span className={styles.stepLabel}>{step.label}</span>
                                    {index < 2 && <div className={styles.stepLine} />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {task.status === 'complete' || task.status === 'completed' ? (
                    <div className={styles.completedView}>

                        {/* Subscriptor Card */}
                        <div className={styles.subCardContainer}>
                            <span className={styles.sectionLabel}>คนทิ้งขยะ</span>
                            <div className={styles.subCard} onClick={() => navigate(`/esg/subscriptor-detail/${task.esg_subscriptor_id}/${new Date(task.date).getDate()}`)}>
                                <div className={styles.subInfo}>
                                    <div className={styles.avatarContainer}>
                                        <img src={task.user_avatar || profileLogo} className={styles.avatar} alt="Avatar" />
                                        <div className={styles.onlineIndicator} />
                                    </div>
                                    <div className={styles.details}>
                                        <div className={styles.nameRow}>
                                            <h3 className={styles.name}>{task.user_name}</h3>
                                        </div>
                                        <p className={styles.packageText}>package : {task.package_name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Date Info Section */}
                        <div className={styles.dateInfoSection}>
                            <div className={styles.dateRow}>
                                <div className={styles.dateIcon}>🚚</div>
                                <div className={styles.dateDetails}>
                                    <div className={styles.dateLabel}>วันที่ไปเอาขยะ</div>
                                    <div className={styles.dateValue}>
                                        {new Date(task.created_at).toLocaleDateString('th-TH', {
                                            day: 'numeric', month: 'long', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className={styles.dateRow}>
                                <div className={styles.dateIcon}>🏁</div>
                                <div className={styles.dateDetails}>
                                    <div className={styles.dateLabel}>วันที่ปิดงาน</div>
                                    <div className={styles.dateValue}>
                                        {task.complete_time ? new Date(task.complete_time).toLocaleDateString('th-TH', {
                                            day: 'numeric', month: 'long', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        }) : '---'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trash & Impact Section */}
                        <div className={styles.actionButtons}>
                            <button className={styles.outlineBtn} onClick={() => navigate(`/esg/trash-type/${id}`)}>
                                <div className={styles.btnLeft}>
                                    <span className={`${styles.btnIcon} ${styles.trashIcon}`}>📦</span>
                                    <span className={styles.btnTitle}>ประเภทและน้ำหนักขยะ</span>
                                </div>
                                <span className={styles.btnArrow}>›</span>
                            </button>
                        </div>

                        <div className={styles.impactSection}>
                            <div className={styles.impactInfo}>
                                <h4>ลด CARBON สะสม</h4>
                                <div className={styles.impactHighlight}>
                                    <span className={styles.impactNumber}>{task.carbon_reduce || '0.00'}</span>
                                    <span className={styles.impactUnit}>kg</span>
                                </div>
                            </div>
                            <div className={styles.impactBadge}>
                                <span>🌳</span>
                                <span>{task.tree_equivalent || '0'}</span>
                            </div>
                        </div>

                        {/* Evidence Images */}
                        {task.evidences_images && task.evidences_images.length > 0 && (
                            <div className={styles.imageGallerySection}>
                                <span className={styles.sectionLabel}>รูปถ่ายตอนส่ง</span>
                                <div className={styles.previewGallery}>
                                    {task.evidences_images.map((img: string, idx: number) => (
                                        <div key={idx} className={styles.previewSlot}>
                                            <img src={img} className={styles.previewImage} alt={`Evidence ${idx + 1}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Receipt Images */}
                        {task.receipt_images && task.receipt_images.length > 0 && (
                            <div className={`${styles.imageGallerySection} ${styles.receiptGallery}`}>
                                <span className={styles.sectionLabel}>รูปถ่ายใบเสร็จ</span>
                                <div className={styles.previewGallery}>
                                    {task.receipt_images.map((img: string, idx: number) => (
                                        <div key={idx} className={styles.previewSlot}>
                                            <img src={img} className={styles.previewImage} alt={`Receipt ${idx + 1}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : task.status === 'pending' ? (
                    <>
                        {/* Driver & Factory Distance */}
                        <div className={styles.distanceContainer}>
                            <div className={styles.distanceLabel}>
                                <span>ระยะห่างจากโรงงาน</span>
                                <span className={styles.distanceValue}>
                                    {distance !== null ? (distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`) : '---'}
                                </span>
                            </div>
                            <div className={`${styles.distanceStatus} ${isInRadius ? styles.statusInRadius : styles.statusOutOfRadius}`}>
                                {isInRadius ? 'อยู่ในระยะที่กำหนด' : 'อยู่นอกระยะ'}
                            </div>
                        </div>

                        {/* Subscriptor Card */}
                        <div className={styles.subCardContainer}>
                            <span className={styles.sectionLabel}>คนทิ้งขยะ</span>
                            <div className={styles.subCard} onClick={() => navigate(`/esg/subscriptor-detail/${task.esg_subscriptor_id}/${new Date(task.date).getDate()}`)}>
                                <div className={styles.subInfo}>
                                    <div className={styles.avatarContainer}>
                                        <img src={task.user_avatar || profileLogo} className={styles.avatar} alt="Avatar" />
                                        <div className={styles.onlineIndicator} />
                                    </div>
                                    <div className={styles.details}>
                                        <div className={styles.nameRow}>
                                            <h3 className={styles.name}>{task.user_name}</h3>
                                        </div>
                                        <p className={styles.packageText}>package : {task.package_name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className={styles.actionButtons}>
                            <button className={styles.outlineBtn} onClick={() => navigate(`/esg/trash-type/${id}`)}>
                                <div className={styles.btnLeft}>
                                    <span className={`${styles.btnIcon} ${styles.trashIcon}`}>📦</span>
                                    <span className={styles.btnTitle}>ประเภทและน้ำหนักขยะ</span>
                                </div>
                                <span className={styles.btnArrow}>›</span>
                            </button>

                            <button className={styles.outlineBtn} onClick={openInternalMap}>
                                <div className={styles.btnLeft}>
                                    <span className={`${styles.btnIcon} ${styles.routeIcon}`}>📍</span>
                                    <span className={styles.btnTitle}>เส้นทางไปโรงงานรีไซเคิล</span>
                                </div>
                                <span className={styles.btnArrow}>›</span>
                            </button>
                        </div>

                        {/* Upload Evidence */}
                        <div className={styles.uploadGridSection}>
                            <span className={styles.sectionLabel}>
                                รูปถ่ายตอนส่ง (อย่างน้อย 3 รูป)
                                {uploadedEvidenceCount >= 3 && <span className={styles.successBadge}>✓ ครบแล้ว</span>}
                            </span>
                            <div className={styles.photoGrid}>
                                {(evidenceImages.filter(img => img !== null) as string[]).map((img, idx) => (
                                    <div key={idx} className={styles.photoSlot}>
                                        <img src={img} className={styles.photoPreview} alt={`Evidence ${idx + 1}`} />
                                        <button className={styles.removePhoto} onClick={() => removeImage(idx, 'evidence')}>×</button>
                                    </div>
                                ))}

                                <div className={styles.photoSlot} onClick={() => {
                                    setActivePhotoSlot({ index: evidenceImages.length, type: 'evidence' });
                                    setShowPhotoOptions(true);
                                }}>
                                    <div className={styles.uploadLabel}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                                        <span>เพิ่มรูปถ่าย</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Upload Receipt */}
                        <div className={`${styles.uploadGridSection} ${styles.receiptSection}`}>
                            <span className={styles.sectionLabel}>
                                รูปถ่ายใบเสร็จ (อย่างน้อย 1 รูป)
                                {receiptImage && <span className={styles.successBadge}>✓ อัปโหลดแล้ว</span>}
                            </span>
                            <div className={styles.singlePhotoGrid}>
                                <div className={styles.photoSlot}>
                                    {receiptImage ? (
                                        <>
                                            <img src={receiptImage} className={styles.photoPreview} alt="Receipt" />
                                            <button className={styles.removePhoto} onClick={() => removeImage(0, 'receipt')}>×</button>
                                        </>
                                    ) : (
                                        <div className={styles.uploadLabel} onClick={() => {
                                            setActivePhotoSlot({ index: 0, type: 'receipt' });
                                            setShowPhotoOptions(true);
                                        }}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                                            <span>เพิ่มใบเสร็จ</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Original Waiting UI (Simplified) */}
                        <div className={styles.gpsSection}>
                            <button className={styles.gpsButton} onClick={() => navigate(`/esg/task-explore/${id}`)}>
                                <div className={styles.gpsIcon}>
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                    </svg>
                                </div>
                                <div className={styles.gpsText}>
                                    <h3>แผนที่นำทาง</h3>
                                    <p>คลิกเพื่อดูเส้นทางไปยังตำแหน่งลูกค้า</p>
                                </div>
                                <div className={styles.chevronIcon}>
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" /></svg>
                                </div>
                            </button>
                        </div>

                        <div className={styles.subCardContainer}>
                            <span className={styles.sectionLabel}>SUBSCRIBTOR</span>
                            <div className={styles.subCard} onClick={() => navigate(`/esg/subscriptor-detail/${task.esg_subscriptor_id}/${new Date(task.date).getDate()}`)}>
                                <div className={styles.subInfo}>
                                    <div className={styles.avatarContainer}>
                                        <img src={task.user_avatar || profileLogo} className={styles.avatar} alt="Avatar" />
                                        <div className={styles.onlineIndicator} />
                                    </div>
                                    <div className={styles.details}>
                                        <div className={styles.nameRow}><h3 className={styles.name}>{task.user_name}</h3></div>
                                        <p className={styles.packageText}>package : {task.package_name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {task.status !== 'complete' && task.status !== 'completed' && (
                <PageFooter
                    title={task.status === 'pending' ? "Complete Task" : "ใส่ข้อมูลการทิ้งขยะ"}
                    onClick={task.status === 'pending' ? handleFinalizeTask : () => navigate(`/esg/trash-info/${id}`)}
                    variant="orange"
                    disabled={task.status === 'pending' && (!isReadyToComplete || isSubmitting)}
                    showArrow={false}
                />
            )}

            <AlertPopup
                isOpen={showSuccess}
                title="ภารกิจเสร็จสิ้น!"
                message={
                    <div style={{ textAlign: 'center' }}>
                        <p>คุณได้ส่งขยะรีไซเคิลและบันทึกข้อมูลเรียบร้อยแล้ว</p>
                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF9500' }}>
                                + {coinsEarned} เหรียญ
                            </div>
                            <div style={{ fontSize: '14px', color: '#ccc', marginTop: '4px' }}>
                                น้ำหนักขยะรวม {completedWeight?.toFixed(1)} kg
                            </div>
                        </div>
                    </div>
                }
                onClose={() => navigate('/esg/today_tasks')}
            />

            <AlertPopup
                isOpen={!!error}
                title="ไม่สามารถดำเนินการได้"
                message={error || ""}
                onClose={() => setError(null)}
            />

            {/* Photo Selection Modal */}
            {showPhotoOptions && (
                <>
                    <div className={styles.modalOverlay} onClick={() => setShowPhotoOptions(false)} />
                    <div className={styles.photoOptionsModal}>
                        <div className={styles.photoOptionsHeader}>
                            <h3>อัปโหลดรูปภาพ</h3>
                            <button className={styles.closeBtn} onClick={() => setShowPhotoOptions(false)}>×</button>
                        </div>
                        <div className={styles.photoOptionsList}>
                            <div className={styles.photoOptionBtn} onClick={() => triggerUpload('camera')}>
                                <div className={styles.photoOptionIcon}>📷</div>
                                <div className={styles.photoOptionText}>
                                    <div className={styles.photoOptionTitle}>ถ่ายรูป</div>
                                    <div className={styles.photoOptionDesc}>ใช้กล้องถ่ายรูปใหม่</div>
                                </div>
                            </div>
                            <div className={styles.photoOptionBtn} onClick={() => triggerUpload('gallery')}>
                                <div className={styles.photoOptionIcon}>🖼️</div>
                                <div className={styles.photoOptionText}>
                                    <div className={styles.photoOptionTitle}>เลือกจากแกลเลอรี</div>
                                    <div className={styles.photoOptionDesc}>เลือกรูปภาพที่มีอยู่แล้ว</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hidden actual file inputs */}
                    <input
                        id="camera-upload"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={activePhotoSlot ? handleImageChange(activePhotoSlot.type, activePhotoSlot.index) : undefined}
                        hidden
                    />
                    <input
                        id="gallery-upload"
                        type="file"
                        accept="image/*"
                        multiple={activePhotoSlot?.type === 'evidence'}
                        onChange={activePhotoSlot ? handleImageChange(activePhotoSlot.type, activePhotoSlot.index) : undefined}
                        hidden
                    />
                </>
            )}
        </div>
    );
};

export default EsgTaskMonitor;
