import React from 'react';
import styles from './PageFooter.module.css';

interface PageFooterProps {
    title: string;
    onClick: () => void;
    disabled?: boolean;
    showArrow?: boolean;
    variant?: 'orange' | 'green';
}

const PageFooter: React.FC<PageFooterProps> = ({
    title,
    onClick,
    disabled,
    showArrow = true,
    variant = 'orange'
}) => {
    return (
        <div className={styles['footer-action']}>
            <button
                className={variant === 'green' ? styles['btn-green'] : styles['btn-next']}
                onClick={onClick}
                disabled={disabled}
            >
                {title} {showArrow && '➔'}
            </button>
        </div>
    );
};

export default PageFooter;
