import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styles from "./EsgTrashInfo.module.css";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
interface TrashItem {
    id: string;
    type: string;
    weight: string;
}

const COMMON_CATEGORIES = [
    { name: "กระดาษ", icon: "📄" },          // Paper
    { name: "พลาสติก", icon: "🥤" },         // Plastic
    { name: "โลหะและอลูมิเนียม", icon: "🥫" }, // Metal & Aluminum
    { name: "แก้ว", icon: "🍾" }             // Glass
];

function EsgTrashInfo() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [trashList, setTrashList] = useState<TrashItem[]>([]);
    const [selectedFactory, setSelectedFactory] = useState<any | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [task, setTask] = useState<any>(null);

    // Persistence: Load from localStorage on mount
    useEffect(() => {
        const savedData = localStorage.getItem(`trash_info_${id}`);
        if (savedData) {
            try {
                const { trashList: savedList, selectedFactory: savedFactory } = JSON.parse(savedData);
                if (savedList) setTrashList(savedList);
                if (savedFactory) setSelectedFactory(savedFactory);
            } catch (e) {
                console.error("Failed to parse saved trash info", e);
            }
        }
        setIsInitialized(true);
    }, [id]);

    // Handle Factory returned from navigation state (ChooseFactory page)
    useEffect(() => {
        if (location.state?.selectedFactory) {
            setSelectedFactory(location.state.selectedFactory);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchTaskDetails = async () => {
            const token = getToken();
            if (!token || !id) return;
            try {
                const data = await api.getEsgTaskById(token, id);
                setTask(data.task);
            } catch (error) {
                console.error("Failed to fetch task details:", error);
            }
        };

        fetchTaskDetails();
    }, [id]);

    // Persistence: Save to localStorage whenever state changes
    useEffect(() => {
        if (!isInitialized) return;

        localStorage.setItem(`trash_info_${id}`, JSON.stringify({
            trashList,
            selectedFactory
        }));
    }, [id, trashList, selectedFactory, isInitialized]);

    const handleAddMore = () => {
        const newItem: TrashItem = {
            id: Date.now().toString(),
            type: '',
            weight: ''
        };
        setTrashList([...trashList, newItem]);
    };

    const handleUpdateItem = (id: string, field: keyof TrashItem, value: string) => {
        setTrashList(trashList.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleRemoveItem = (id: string) => {
        setTrashList(trashList.filter(item => item.id !== id));
    };

    const isValid = trashList.length > 0 && trashList.every(item => item.type && item.weight && parseFloat(item.weight) > 0);

    return (
        <div className={styles.container}>
            <PageHeader title="บันทึกข้อมูลขยะ" onBack={() => navigate(-1)} />

            <div className={styles.content}>
                <div className={styles.headerSection}>
                    <h2 className={styles.title}>ข้อมูลการเก็บขยะ</h2>
                    <p className={styles.subtitle}>กรุณาระบุประเภทและน้ำหนักของขยะที่เก็บได้</p>
                    {task?.package_name && (
                        <div className={styles.maxWeightInfo}>
                            แพ็กเกจ: <strong>{task.package_name}</strong>
                            {task.package_name.toLowerCase().includes('enterprise') && ' (สูงสุด 200kg)'}
                            {task.package_name.toLowerCase().includes('standard') && ' (สูงสุด 50kg)'}
                        </div>
                    )}
                </div>

                {trashList.length === 0 ? (
                    <div className={styles.emptyStateContainer}>
                        <div className={styles.emptyIcon}>♻️</div>
                        <p className={styles.emptyText}>ยังไม่มีข้อมูลขยะ</p>
                        <p className={styles.emptySubtext}>กดปุ่มด้านล่างเพื่อเพิ่มข้อมูลขยะที่เก็บได้</p>
                    </div>
                ) : (
                    <div className={styles.trashList}>
                        {trashList.map((item, index) => (
                            <div key={item.id} className={styles.trashCard}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.itemIndex}>รายการที่ {index + 1}</span>
                                    <button
                                        className={styles.removeButton}
                                        onClick={() => handleRemoveItem(item.id)}
                                    >
                                        ลบ
                                    </button>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label>ประเภทขยะ</label>
                                    <div className={styles.dropdownContainer}>
                                        <details className={styles.modernDropdown}>
                                            <summary className={styles.dropdownSummary}>
                                                <div className={styles.summaryContent}>
                                                    {item.type ? (
                                                        <>
                                                            <span className={styles.selectedIcon}>
                                                                {COMMON_CATEGORIES.find(c => c.name === item.type)?.icon}
                                                            </span>
                                                            {item.type}
                                                        </>
                                                    ) : (
                                                        "เลือกประเภทขยะ"
                                                    )}
                                                </div>
                                                <div className={styles.dropdownArrow}>
                                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M7 10l5 5 5-5z" />
                                                    </svg>
                                                </div>
                                            </summary>
                                            <ul className={styles.dropdownList}>
                                                {COMMON_CATEGORIES.map(cat => (
                                                    <li key={cat.name} className={styles.dropdownItem}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                handleUpdateItem(item.id, 'type', cat.name);
                                                                // Close details manually
                                                                (e.currentTarget.closest('details') as HTMLDetailsElement).open = false;
                                                            }}
                                                            className={styles.itemButton}
                                                        >
                                                            <span className={styles.catIcon}>{cat.icon}</span>
                                                            {cat.name}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    </div>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label>น้ำหนัก</label>
                                    <div className={styles.weightInputWrapper}>
                                        <input
                                            type="number"
                                            placeholder="0.0"
                                            value={item.weight}
                                            onChange={(e) => handleUpdateItem(item.id, 'weight', e.target.value)}
                                            className={styles.weightInput}
                                        />
                                        <span className={styles.unit}>kg</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button className={styles.addButton} onClick={handleAddMore}>
                    <span className={styles.plus}>+</span> เพิ่มประเภทขยะ
                </button>
            </div>

            <PageFooter
                title="เลือกโรงงานรีไซเคิล"
                onClick={() => navigate(`/esg/choose-factory/${id}`)}
                disabled={!isValid}
                variant="orange"
                showArrow={true}
            />
        </div>
    );
}

export default EsgTrashInfo;
