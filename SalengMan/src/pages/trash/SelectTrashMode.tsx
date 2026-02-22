import { useNavigate } from "react-router-dom";
import styles from "../sell/Sell.module.css";
import { useTrash } from "../../context/TrashContext";
import PageHeader from "../../components/PageHeader";

function SelectTrashMode() {
    const navigate = useNavigate();
    const { setMode } = useTrash();

    const handleSelectMode = (mode: 'anytime' | 'fixtime') => {
        setMode(mode);
        if (mode === 'anytime') {
            navigate('/trash/details');
        } else {
            // Fix time flow not fully specified yet, but we'll navigate to details for now
            navigate('/trash/details');
        }
    };

    return (
        <div className={styles['page']}>
            <PageHeader title="Select Mode" backTo="/home" />

            <div className={styles['content']} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>Choose Disposing Mode</h2>

                {/* Anytime Card */}
                <div
                    className={styles['card']}
                    onClick={() => handleSelectMode('anytime')}
                    style={{ cursor: 'pointer', padding: '24px', border: '2px solid transparent', transition: 'all 0.2s' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                            🕒
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Anytime</h3>
                            <p style={{ color: '#666', fontSize: '14px', margin: '4px 0 0 0' }}>Dispose anytime, driver will pick up when available.</p>
                        </div>
                    </div>
                </div>

                {/* Fixtime Card */}
                <div
                    className={styles['card']}
                    onClick={() => handleSelectMode('fixtime')}
                    style={{ cursor: 'pointer', padding: '24px', border: '2px solid transparent', transition: 'all 0.2s' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                            📅
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Fix Time</h3>
                            <p style={{ color: '#666', fontSize: '14px', margin: '4px 0 0 0' }}>Schedule a specific date and time for pickup.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SelectTrashMode;
