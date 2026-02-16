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
                {title} ➔
            </button>
        </div>
    );
};

export default PageFooter;
