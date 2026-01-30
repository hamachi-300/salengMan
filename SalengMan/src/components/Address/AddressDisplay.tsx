import React, { useState } from 'react';
import './Address.css';
import { Address } from '../../types/address';
import AddressModal from './AddressModal';

interface AddressDisplayProps {
    address: Address | null;
    onAddressChange: (address: Address) => void;
}

const AddressDisplay: React.FC<AddressDisplayProps> = ({ address, onAddressChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="address-display-container">
                <div className="address-header">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    ที่อยู่ในการจัดส่ง (Shipping Address)
                </div>

                <div className="address-content">
                    {address ? (
                        <>
                            <div className="address-info">
                                <span className="address-name-phone">{address.name}</span>
                                <span className="address-name-phone" style={{ fontWeight: 400 }}> (+66) {address.phone.replace(/^0/, '')}</span>
                                <span className="address-details-text">{address.details}</span>
                            </div>

                            <div className="address-actions-row">
                                <div>
                                    {address.isDefault && (
                                        <span className="default-badge-outline">ค่าเริ่มต้น (Default)</span>
                                    )}
                                </div>
                                <button className="change-btn-outlined" onClick={() => setIsModalOpen(true)}>
                                    เปลี่ยน (Change) <span style={{ fontSize: '1.2em', lineHeight: 0.5 }}>›</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="address-info" style={{ color: '#888' }}>
                                กรุณาเลือกที่อยู่จัดส่ง (Please select address)
                            </div>
                            <div className="address-actions-row">
                                <div></div>
                                <button className="change-btn-outlined" onClick={() => setIsModalOpen(true)}>
                                    เลือก (Select) <span style={{ fontSize: '1.2em', lineHeight: 0.5 }}>›</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <AddressModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                currentAddressId={address?.id}
                onSelect={(newAddr) => {
                    onAddressChange(newAddr);
                    setIsModalOpen(false);
                }}
            />
        </>
    );
};

export default AddressDisplay;
