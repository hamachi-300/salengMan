import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ItemSelectSaveAddress.css';

interface Address {
  id: number;
  label: string;
  icon: string;
  address: string;
  city: string;
  phone: string;
  isDefault: boolean;
  selected: boolean;
}

const ItemSelectSaveAddress: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: 1,
      label: 'Home',
      icon: '⌂',
      address: '128/95 Moo 4, Soi Sukhumvit 42,\nPhra Khanong, Khlong Toei,',
      city: 'Bangkok 24240',
      phone: '081-234-5678',
      isDefault: true,
      selected: true
    },
    {
      id: 2,
      label: 'Office',
      icon: '💼',
      address: '45 Empire Tower, 23rd Floor,\nSathon Tai Road, Yannawa,',
      city: 'Bangkok 10120',
      phone: '089-999-8888',
      isDefault: false,
      selected: false
    }
  ]);

  const [formData, setFormData] = useState({ label: '', text: '', city: '', phone: '' });

  const selectAddress = (id: number) => {
    setAddresses(prev => prev.map(addr => ({ ...addr, selected: addr.id === id })));
  };

  // ฟังก์ชันส่งข้อมูลกลับ
  const handleSelect = () => {
    const selectedAddr = addresses.find(a => a.selected);
    if (selectedAddr) {
      // เก็บข้อมูลลง localStorage เพื่อให้หน้า Specify ดึงไปใช้
      localStorage.setItem('selectedFromSaved', JSON.stringify({
        address: selectedAddr.address,
        zipCode: selectedAddr.city.match(/\d+/)?.[0] || '' // ดึงตัวเลขรหัสไปรษณีย์ออกมา
      }));
      navigate('/ItemSpecifyLocation');
    }
  };

  const addNewAddress = () => {
    if (formData.label && formData.text && formData.city) {
      const newAddr: Address = {
        id: Date.now(),
        label: formData.label,
        icon: formData.label.toLowerCase().includes('home') ? '⌂' : '📍',
        address: formData.text,
        city: formData.city,
        phone: formData.phone || '-',
        isDefault: false,
        selected: true
      };
      setAddresses(prev => [...prev.map(a => ({ ...a, selected: false })), newAddr]);
      setIsModalOpen(false);
      setFormData({ label: '', text: '', city: '', phone: '' });
    }
  };

  return (
    <div className="post-item-container address-page">
      <div className="post-header">
        <button className="back-button" onClick={() => navigate('/ItemSpecifyLocation')}>❮</button>
        <span className="header-title">Post Item</span>
      </div>

      <div className="scrollable-content">
        <div className="section">
          <div className="intro-group">
            <h2 className="main-label" style={{fontSize: '1.75rem'}}>Select Location</h2>
            <p className="text-small" style={{marginBottom: '20px', opacity: 0.6}}>Where should we pick up your items?</p>
          </div>

          <div className="address-card-list">
            {addresses.map(addr => (
              <div 
                key={addr.id} 
                className={`addr-item ${addr.selected ? 'selected' : ''}`}
                onClick={() => selectAddress(addr.id)}
              >
                <div className="addr-header">
                  <div className="label-group">
                    <span className="symbol-icon">{addr.icon}</span>
                    <span className="label-name">{addr.label}</span>
                    {addr.isDefault && <span className="badge-default">Default</span>}
                  </div>
                  <div className="check-circle">
                    {addr.selected && <span className="check-symbol">✔</span>}
                  </div>
                </div>
                <div className="addr-details">
                  <p className="addr-main-text">{addr.address}</p>
                  <p className="addr-city">{addr.city}</p>
                  <p className="addr-phone">{addr.phone}</p>
                </div>
              </div>
            ))}

            <button className="add-new-dashed" onClick={() => setIsModalOpen(true)}>
              <span>⊕ Add New Address</span>
            </button>
          </div>
        </div>
      </div>

      <div className="footer-action dual-btns">
        <button className="btn-cancel-flat" onClick={() => navigate('/ItemSpecifyLocation')}>Cancel</button>
        <button className="btn-next" onClick={handleSelect}>Select</button>
      </div>

      {isModalOpen && (
        <div className="image-modal" onClick={() => setIsModalOpen(false)}>
          <div className="form-card" onClick={e => e.stopPropagation()} style={{width: '90%'}}>
            <h3 className="main-label" style={{marginBottom: '16px'}}>Add New Address</h3>
            <input className="custom-textarea modal-input" placeholder="Label (e.g. Home)" value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} />
            <textarea className="custom-textarea modal-input" placeholder="Address" rows={3} value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} />
            <input className="custom-textarea modal-input" placeholder="City & Postal Code" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
            <div className="dual-btns" style={{marginTop: '16px'}}>
              <button className="btn-cancel-flat" onClick={() => setIsModalOpen(false)}>Back</button>
              <button className="btn-next" onClick={addNewAddress}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemSelectSaveAddress;