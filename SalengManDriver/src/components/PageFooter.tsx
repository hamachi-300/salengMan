import React from 'react';
import styles from './PageFooter.module.css';

interface PageFooterProps {
    title: string;
    onClick: () => void;
    disabled?: boolean;
    showArrow?: boolean;
    variant?: 'orange' | 'green';
    icon?: React.ReactNode;
}

const PageFooter: React.FC<PageFooterProps> = ({
    title,
    onClick,
    disabled,
    showArrow = true,
    variant = 'orange',
    icon
}) => {
    return (
        <div className={styles['footer-action']}>
            <button
                className={variant === 'green' ? styles['btn-green'] : styles['btn-next']}
                onClick={onClick}
                disabled={disabled}
            >
                {icon}
                {title}
                {showArrow && !icon && (
                    <svg viewBox="0 0 24 24" fill="currentColor" className={styles['btn-icon']}>
                        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                    </svg>
                )}
            </button>
        </div>
    );
};

export default PageFooter;
