import React from 'react';
import styles from './PageFooter.module.css';

interface PageFooterProps {
    title: string;
    onClick: () => void;
    disabled?: boolean;
}

const PageFooter: React.FC<PageFooterProps> = ({ title, onClick, disabled }) => {
    return (
        <div className={styles['footer-action']}>
            <button
                className={styles['btn-next']}
                onClick={onClick}
                disabled={disabled}
            >
                {title}
                <svg viewBox="0 0 24 24" fill="currentColor" className={styles['btn-icon']}>
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
            </button>
        </div>
    );
};

export default PageFooter;
