import React, { useState, useEffect } from 'react';
import './Address.css';
import { Address } from '../../types/address';
import { db, auth } from '../../firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

interface AddressModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentAddressId?: string;
    onSelect: (address: Address) => void;
}

const AddressModal: React.FC<AddressModalProps> = ({ isOpen, onClose, currentAddressId, onSelect }) => {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAddress, setNewAddress] = useState({
        name: '',
        phone: '',
        details: '',
        label: 'Home',
        isDefault: false
    });

    useEffect(() => {
        if (!auth.currentUser) return;

        const q = query(collection(db, `users/${auth.currentUser.uid}/addresses`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched: Address[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Address));
            // Sort: Default first
            fetched.sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1));
            setAddresses(fetched);
        });
        return () => unsubscribe();
    }, []);

    const handleSaveNew = async () => {
        if (!auth.currentUser || !newAddress.name || !newAddress.details || !newAddress.phone) {
            alert("Please fill in all fields");
            return;
        }

        try {
            const docRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/addresses`), {
                ...newAddress,
                createdAt: serverTimestamp()
            });
            setShowAddForm(false);
            setNewAddress({ name: '', phone: '', details: '', label: 'Home', isDefault: false });

            // Auto select
            onSelect({ id: docRef.id, ...newAddress } as Address);
            onClose();
        } catch (error) {
            console.error("Error adding address:", error);
            alert("Failed to save address");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span>My Addresses</span>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="address-list">
                    {!showAddForm ? (
                        <>
                            {addresses.map(addr => (
                                <div key={addr.id} className="address-item" onClick={() => { onSelect(addr); onClose(); }}>
                                    <input
                                        type="radio"
                                        name="address"
                                        className="address-radio"
                                        checked={currentAddressId === addr.id}
                                        onChange={() => { }}
                                    />
                                    <div className="address-item-details">
                                        <div className="item-header">
                                            <div className="item-name-row">
                                                <span className="item-name">{addr.name}</span>
                                                <span className="item-phone">(+66) {addr.phone.replace(/^0/, '')}</span>
                                            </div>
                                            <button className="edit-link" onClick={(e) => {
                                                e.stopPropagation();
                                                alert("Edit feature coming soon");
                                            }}>Edit</button>
                                        </div>
                                        <div className="item-address">
                                            {addr.details}
                                        </div>
                                        <div className="badges-row">
                                            {addr.isDefault && <span className="badge-default">Default</span>}
                                            {addr.label && addr.label.toLowerCase() !== "home" && <span className="badge-tag">{addr.label}</span>}
                                            {/* Static Mock Badges from design if needed, e.g. Pickup Address */}
                                            {/* <span className="badge-tag">Pickup Address</span> */}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {addresses.length === 0 && (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                                    No addresses found.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="address-form-container">
                            <h4 style={{ marginTop: 0, marginBottom: 20 }}>Add New Address</h4>
                            <div className="form-group-modal">
                                <label className="form-label-modal">Name</label>
                                <input className="form-input-modal" placeholder="Full Name"
                                    value={newAddress.name} onChange={e => setNewAddress({ ...newAddress, name: e.target.value })} />
                            </div>
                            <div className="form-group-modal">
                                <label className="form-label-modal">Phone Number</label>
                                <input className="form-input-modal" placeholder="0xxxxxxxxx"
                                    value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} />
                            </div>
                            <div className="form-group-modal">
                                <label className="form-label-modal">Address Details</label>
                                <textarea className="form-input-modal" placeholder="House No, Building, Street, etc." style={{ minHeight: 80, resize: 'vertical' }}
                                    value={newAddress.details} onChange={e => setNewAddress({ ...newAddress, details: e.target.value })} />
                            </div>
                            <div className="form-group-modal">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={newAddress.isDefault} onChange={e => setNewAddress({ ...newAddress, isDefault: e.target.checked })} />
                                    Set as Default Address
                                </label>
                            </div>

                            <div className="form-actions-modal">
                                <button className="change-btn-outlined" onClick={() => setShowAddForm(false)} style={{ border: 'none', backgroundColor: '#f0f0f0' }}>Cancel</button>
                                <button className="add-new-btn-full" style={{ width: 'auto', padding: '10px 30px' }} onClick={handleSaveNew}>Submit</button>
                            </div>
                        </div>
                    )}
                </div>

                {!showAddForm && (
                    <div className="modal-footer">
                        <button className="add-new-btn-full" onClick={() => setShowAddForm(true)}>
                            + Add New Address
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddressModal;
