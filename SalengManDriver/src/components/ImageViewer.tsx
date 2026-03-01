import { useEffect, useState } from 'react';
import styles from './ImageViewer.module.css';

interface ImageViewerProps {
    images: string[];
    initialIndex?: number;
    onClose: () => void;
}

export default function ImageViewer({ images, initialIndex = 0, onClose }: ImageViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, images.length]);

    // Prevent background scrolling when open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!images || images.length === 0) return null;

    const nextImage = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>

            <div className={styles.imageContainer} onClick={(e) => e.stopPropagation()}>
                {images.length > 1 && (
                    <button className={`${styles.navButton} ${styles.prevButton}`} onClick={prevImage} aria-label="Previous image">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                )}

                <img
                    src={images[currentIndex]}
                    alt={`Full size view ${currentIndex + 1} of ${images.length}`}
                    className={styles.image}
                    onClick={(e) => e.stopPropagation()}
                />

                {images.length > 1 && (
                    <button className={`${styles.navButton} ${styles.nextButton}`} onClick={nextImage} aria-label="Next image">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                )}
            </div>

            {images.length > 1 && (
                <div className={styles.counter}>
                    {currentIndex + 1} / {images.length}
                </div>
            )}
        </div>
    );
}
