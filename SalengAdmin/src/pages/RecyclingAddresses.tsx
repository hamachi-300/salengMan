import { useState, useEffect, useRef } from 'react';
import { Factory, Plus, Edit2, Trash2, MapPin, Phone, Image as ImageIcon, X, Upload, Loader2, Search } from 'lucide-react';
import styles from './RecyclingAddresses.module.css';
import { API_URL } from '../config';
import MapSelector from '../components/MapSelector';

interface RecyclingAddress {
    address_id: string;
    label: string;
    address: string;
    lat?: number;
    lng?: number;
    phone?: string;
    note?: string;
    province?: string;
    district?: string;
    images: string[];
    created_at?: string;
    updated_at?: string;
}

const RecyclingAddresses = () => {
    const [addresses, setAddresses] = useState<RecyclingAddress[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState<RecyclingAddress | null>(null);
    const [formData, setFormData] = useState<Partial<RecyclingAddress>>({
        address_id: '',
        label: '',
        address: '',
        lat: undefined,
        lng: undefined,
        phone: '',
        note: '',
        province: '',
        district: '',
        images: []
    });
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const token = localStorage.getItem('token');

    const fetchAddresses = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/recycling-addresses`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                    return;
                }
                throw new Error(data.error || 'Failed to fetch addresses');
            }

            if (Array.isArray(data)) {
                setAddresses(data);
            } else {
                console.error('Expected array but received:', data);
                setAddresses([]);
            }
        } catch (error) {
            console.error('Error fetching recycling addresses:', error);
            setAddresses([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAddresses();
    }, []);

    const formatPhoneNumber = (value: string) => {
        if (!value) return value;
        const phone = value.replace(/[^\d]/g, '');
        if (phone.length < 4) return phone;
        if (phone.length < 7) return `${phone.slice(0, 3)}-${phone.slice(3)}`;
        return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6, 10)}`;
    };

    const handleOpenModal = (address?: RecyclingAddress) => {
        if (address) {
            setEditingAddress(address);
            setFormData(address);
        } else {
            setEditingAddress(null);
            setFormData({
                address_id: '',
                label: '',
                address: '',
                lat: undefined,
                lng: undefined,
                phone: '',
                note: '',
                province: '',
                district: '',
                images: []
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingAddress(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'phone') {
            setFormData(prev => ({ ...prev, phone: formatPhoneNumber(value) }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: (name === 'lat' || name === 'lng') ? (value ? parseFloat(value) : undefined) : value
        }));
    };

    const handleLocationSelect = (loc: any) => {
        setFormData(prev => ({
            ...prev,
            lat: loc.lat,
            lng: loc.lng,
            address: loc.address,
            province: loc.province,
            district: loc.district || loc.sub_district || ""
        }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch(`${API_URL}/upload/factory-image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!response.ok) throw new Error('Upload failed');
                const data = await response.json();
                return data.url;
            });

            const newUrls = await Promise.all(uploadPromises);
            setFormData(prev => ({
                ...prev,
                images: [...(prev.images || []), ...newUrls]
            }));
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload one or more images');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: (prev.images || []).filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingAddress
            ? `${API_URL}/recycling-addresses/${editingAddress.address_id}`
            : `${API_URL}/recycling-addresses`;

        const method = editingAddress ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                handleCloseModal();
                fetchAddresses();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to save address');
            }
        } catch (error) {
            console.error('Error saving recycling address:', error);
            alert('An error occurred while saving.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this recycling address?')) return;

        try {
            const response = await fetch(`${API_URL}/recycling-addresses/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchAddresses();
            } else {
                alert('Failed to delete address');
            }
        } catch (error) {
            console.error('Error deleting recycling address:', error);
        }
    };

    const filteredAddresses = addresses.filter(addr =>
        addr.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        addr.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        addr.address_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.recyclingPage}>
            <div className="header">
                <div>
                    <h1>Recycling Factories</h1>
                    <p className="subtitle">Manage recycling collection points and factory addresses</p>
                </div>
            </div>

            <div className={styles.mgmtCard}>
                <div className={styles.cardHeaderWithSearch}>
                    <h2 className={styles.cardTitle}>Factory List</h2>
                    <div className={styles.actionButtons}>
                        <div className={styles.searchBox}>
                            <Search size={18} className={styles.searchIconMain} />
                            <input
                                type="text"
                                placeholder="Search factories..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button className={styles.searchClearBtn} onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <button className={styles.addBtn} onClick={() => handleOpenModal()}>
                            <Plus size={18} />
                            <span>Add Factory</span>
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner}></div>
                            <p>Loading addresses...</p>
                        </div>
                    ) : filteredAddresses.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Factory size={48} />
                            <p>No recycling addresses found</p>
                        </div>
                    ) : (
                        <table className={styles.addressesTable}>
                            <thead>
                                <tr>
                                    <th>ID / Label</th>
                                    <th>Location</th>
                                    <th>Contact</th>
                                    <th>Details</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAddresses.map((addr) => (
                                    <tr key={addr.address_id} className={styles.addressRow}>
                                        <td data-label="ID / Label">
                                            <span className={styles.idLabel}>{addr.label}</span>
                                            <span className={styles.idValue}>{addr.address_id}</span>
                                        </td>
                                        <td data-label="Location">
                                            <div className={styles.addressText}>
                                                <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                                {addr.address}
                                                <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>
                                                    {addr.district}, {addr.province}
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Contact">
                                            {addr.phone && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem' }}>
                                                    <Phone size={14} />
                                                    {addr.phone}
                                                </div>
                                            )}
                                        </td>
                                        <td data-label="Details">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                                                {addr.lat && <span>Lat: {addr.lat.toFixed(6)}</span>}
                                                {addr.lng && <span>Lng: {addr.lng.toFixed(6)}</span>}
                                                {addr.images && addr.images.length > 0 ? (
                                                    <span><ImageIcon size={12} /> {addr.images.length} images</span>
                                                ) : <span>No images</span>}
                                            </div>
                                        </td>
                                        <td className={styles.actionsCell}>
                                            <button className={styles.editBtn} title="Edit" onClick={() => handleOpenModal(addr)}>
                                                <Edit2 size={18} />
                                            </button>
                                            <button className={styles.deleteBtn} title="Delete" onClick={() => handleDelete(addr.address_id)}>
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>{editingAddress ? 'Edit Factory' : 'Add New Factory'}</h2>
                            <button className={styles.closeBtn} onClick={handleCloseModal}>
                                X
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className={styles.mapContainer}>
                                <MapSelector
                                    onLocationSelect={handleLocationSelect}
                                    initialLat={formData.lat}
                                    initialLng={formData.lng}
                                />
                            </div>

                            <div className={styles.formGrid}>
                                {editingAddress && (
                                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                        <label>Factory ID</label>
                                        <input
                                            type="text"
                                            value={formData.address_id}
                                            disabled
                                        />
                                    </div>
                                )}
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>Factory Name *</label>
                                    <input
                                        type="text"
                                        name="label"
                                        value={formData.label}
                                        onChange={handleInputChange}
                                        placeholder="e.g. ABC Recycling Center"
                                        required
                                    />
                                </div>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>Full Address (Auto-filled from map)</label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        placeholder="Pick location on map or enter here..."
                                        rows={2}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>District</label>
                                    <input
                                        type="text"
                                        name="district"
                                        value={formData.district}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Bangrak"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Province</label>
                                    <input
                                        type="text"
                                        name="province"
                                        value={formData.province}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Bangkok"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        name="lat"
                                        value={formData.lat || ''}
                                        onChange={handleInputChange}
                                        placeholder="13.7563"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        name="lng"
                                        value={formData.lng || ''}
                                        onChange={handleInputChange}
                                        placeholder="100.5018"
                                        required
                                    />
                                </div>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>Phone Number *</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="0XX-XXX-XXXX"
                                        required
                                    />
                                </div>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>Note / Special Instructions</label>
                                    <textarea
                                        name="note"
                                        value={formData.note}
                                        onChange={handleInputChange}
                                        placeholder="Any additional details..."
                                        rows={1}
                                    />
                                </div>

                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>Factory Images</label>
                                    <div className={styles.imageUploadSection}>
                                        <div className={styles.imageGrid}>
                                            {(formData.images || []).map((url, index) => (
                                                <div key={index} className={styles.imagePreview}>
                                                    <img src={url} alt={`Factory ${index}`} />
                                                    <button type="button" className={styles.removeImageBtn} onClick={() => removeImage(index)}>
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className={styles.uploadPlaceholder} onClick={() => fileInputRef.current?.click()}>
                                                {uploading ? <Loader2 className="spinner" size={24} /> : <Upload size={24} />}
                                                <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>{uploading ? 'Uploading...' : 'Upload'}</span>
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            className={styles.fileInput}
                                            accept="image/*"
                                            multiple
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.saveBtn} disabled={uploading}>
                                    {editingAddress ? 'Update Factory' : 'Create Factory'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecyclingAddresses;
