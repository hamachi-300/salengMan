import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './Camera.module.css';

interface CameraProps {
    onCapture: (image: string, file: File) => void;
    onClose: () => void;
}

const Camera: React.FC<CameraProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

    const startCamera = useCallback(async () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode },
                audio: false
            });
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
            setError(null);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access camera. Please ensure you have given permission.");
        }
    }, [facingMode]);

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [startCamera]);

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                // Create File object
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                        onCapture(imageDataUrl, file);
                    }
                }, 'image/jpeg', 0.8);
            }
        }
    };

    const toggleFacingMode = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    return (
        <div className={styles['camera-overlay']}>
            <div className={styles['camera-header']}>
                <button className={styles['close-btn']} onClick={onClose}>×</button>
            </div>

            <div className={styles['viewfinder-container']}>
                {error ? (
                    <div className={styles['error-message']}>
                        <p>{error}</p>
                        <button className={styles['retry-btn']} onClick={startCamera}>Retry</button>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className={styles['viewfinder']}
                    />
                )}
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className={styles['camera-controls']}>
                <button className={styles['switch-btn']} onClick={toggleFacingMode} title="Switch Camera">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM5 16l4-4H6c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4z" />
                    </svg>
                </button>
                <button className={styles['capture-btn']} onClick={captureImage}>
                    <div className={styles['capture-btn-inner']} />
                </button>
                <div style={{ width: '44px' }} /> {/* Spacer to center capture button */}
            </div>
        </div>
    );
};

export default Camera;
