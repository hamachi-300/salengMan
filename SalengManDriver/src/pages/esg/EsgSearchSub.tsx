import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EsgSearchSub.module.css';
import PageHeader from '../../components/PageHeader';

const EsgSearchSub: React.FC = () => {
    const navigate = useNavigate();

    // Generate dates 1-28
    const dates = Array.from({ length: 28 }, (_, i) => i + 1);

    const handleDateClick = (date: number) => {
        navigate('/esg/subscriptors', { state: { filterDate: date } });
    };

    return (
        <div className={styles.container}>
            <PageHeader title="ค้นหาผู้จอง (ESG)" onBack={() => navigate('/esg/driver')} />
            <div className={styles.content}>
                <h2 className={styles.sectionTitle}>เลือกวันที่ต้องการทำสัญญา</h2>
                <div className={styles.dateGrid}>
                    {dates.map((date) => (
                        <div
                            key={date}
                            className={styles.dateCard}
                            onClick={() => handleDateClick(date)}
                        >
                            <span className={styles.dateNumber}>{date}</span>
                            <span className={styles.dateLabel}>วันที่</span>
                        </div>
                    ))}
                </div>

                <div className={styles.actionArea}>
                    <button
                        className={styles.searchAllButton}
                        onClick={() => navigate('/esg/subscriptors')}
                    >
                        ค้นหาทั้งหมด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EsgSearchSub;
