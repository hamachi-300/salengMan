import { useState } from 'react';
import styles from './Coin.module.css';
import PageHeader from '../../components/PageHeader';
import PageFooter from '../../components/PageFooter';

interface Package {
  id: string;
  name: string;
  coins: number;
  price: number;
  period?: string;
  currency?: string;
}

export default function Coin() {
  const [userCoins] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [hasMainPackage] = useState(false);

  const mainMonthlyPackages: Package[] = [
    {
      id: 'standard',
      name: 'Standard',
      coins: 10,
      price: 300,
      period: 'month',
      currency: '฿'
    },
    {
      id: 'premium',
      name: 'Premium',
      coins: 20,
      price: 590,
      period: 'month',
      currency: '฿'
    },
    {
      id: 'everyday',
      name: 'Once/Everyday',
      coins: 30,
      price: 880,
      period: 'month',
      currency: '฿'
    },
    {
      id: 'twice-everyday',
      name: 'Twice/Everyday',
      coins: 60,
      price: 1760,
      period: 'month',
      currency: '฿'
    }
  ];

  const oneTimePackages: Package[] = [
    {
      id: 'onetime',
      name: '1 Coin Package',
      coins: 1,
      price: 49,
      currency: '฿'
    }
  ];

  const addonPackages: Package[] = [
    {
      id: 'addon-3',
      name: '3 Coins Add-on',
      coins: 3,
      price: 139,
      currency: '฿'
    },
    {
      id: 'addon-5',
      name: '5 Coins Add-on',
      coins: 5,
      price: 215,
      currency: '฿'
    }
  ];

  const getPackageDetails = (packageId: string | null) => {
    if (!packageId) return null;

    const pkg = [
      ...mainMonthlyPackages,
      ...oneTimePackages,
      ...addonPackages
    ].find(p => p.id === packageId);

    return pkg;
  };

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
  };

  /*
  const handleConfirmPurchase = () => {
    if (selectedPackage) {
      const pkg = getPackageDetails(selectedPackage);
      if (pkg) {
        alert(`Confirming purchase: ${pkg.name} for ${pkg.price}฿`);
        // TODO: Implement purchase logic
      }
    }
  };
  */

  const handleConfirmPurchase = async () => {
  if (selectedPackage) {
    const pkg = getPackageDetails(selectedPackage);
    if (!pkg) {
      alert("Invalid package selected");
      return;
    }
    try {
      // ส่งข้อมูลไปยัง API ของ Backend
      const response = await fetch('https://api.yourdomain.com/v1/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}` // ส่ง Token ยืนยันตัวตน
        },
        body: JSON.stringify({
          packageId: pkg.id,
          price: pkg.price
        })
      });

      const data = await response.json();
      if (data.success) {
        alert("ซื้อสำเร็จ!");
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการเชื่อมต่อ:", error);
    }
  }
};

  const handleReadDetails = () => {
    setShowDetailsModal(true);
  };

  const renderPackageItem = (pkg: Package) => (
    <div
      key={pkg.id}
      className={`${styles.package} ${selectedPackage === pkg.id ? styles.selected : ''}`}
      onClick={() => handlePackageSelect(pkg.id)}
    >
      <div className={styles.checkmark}>✓</div>
      <div className={styles.packageName}>{pkg.name}</div>
      <div className={styles.packageCoins}>{pkg.coins} coins</div>
      <div className={styles.packagePrice}>{pkg.price}{pkg.currency}</div>
      {pkg.period && (
        <div className={styles.packageInfo}>
          Per {pkg.period}
        </div>
      )}
      <div className={styles.bagsInfo}>
        ⚙️ Limited to 3 large garbage bags per token
      </div>
    </div>
  );

  const selectedPackageDetails = getPackageDetails(selectedPackage);

  return (
    <div className={styles.page}>
      <PageHeader title="Coins & Packages" backTo="/home" />

      <div className={styles.header}>
        <div className={styles.coinDisplay}>
          <span>💰</span>
          <div>
            <div className={styles.coinAmount}>{userCoins} Coins</div>
            <div className={styles.coinInfo}>Your current coin balance</div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Main Monthly Packages */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>📅 Main Monthly Packages</div>
          <div className={styles.packageGrid}>
            {mainMonthlyPackages.map(renderPackageItem)}
          </div>
        </div>

        {/* One-Time Package */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>🎁 One-Time Package</div>
          <div className={styles.singlePackageGrid}>
            {oneTimePackages.map(renderPackageItem)}
          </div>
        </div>

        {/* Add-on Packages */}
        {hasMainPackage && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>➕ Add-on Packages</div>
            <p style={{ fontSize: '12px', color: '#666', margin: '0 4px 12px' }}>
              (Available for monthly subscribers only)
            </p>
            <div className={styles.packageGrid}>
              {addonPackages.map(renderPackageItem)}
            </div>
          </div>
        )}

        {/* Selected Package Info */}
        {selectedPackageDetails && (
          <div className={styles.selectedPackageInfo}>
            <h3>Selected: {selectedPackageDetails.name}</h3>
            <p style={{ margin: '8px 0', color: '#666' }}>
              Price: <strong>{selectedPackageDetails.price}{selectedPackageDetails.currency}</strong>
            </p>
            <div className={styles.actionButtons}>
              <button className={styles.btnConfirm} onClick={handleConfirmPurchase}>
                ✓ Confirm Purchase
              </button>
              <button className={styles.btnDetails} onClick={handleReadDetails}>
                📖 Read More
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedPackageDetails && (
        <div className={styles.detailsModal} onClick={() => setShowDetailsModal(false)}>
          <div className={styles.detailsContent} onClick={(e) => e.stopPropagation()}>
            <h3>{selectedPackageDetails.name} Details</h3>
            <ul className={styles.detailsList}>
              <li><strong>Coins:</strong> {selectedPackageDetails.coins} coins</li>
              <li><strong>Price:</strong> {selectedPackageDetails.price}{selectedPackageDetails.currency}</li>
              {selectedPackageDetails.period && (
                <li><strong>Period:</strong> Per {selectedPackageDetails.period}</li>
              )}
              <li><strong>Bag Limit:</strong> 3 large garbage bags per token</li>
              <li><strong>Usage:</strong> Use your coins to dispose of garbage bags</li>
              {selectedPackageDetails.id.includes('addon') && (
                <li><strong>Note:</strong> Only available for monthly package subscribers</li>
              )}
            </ul>
            <button className={styles.closeBtn} onClick={() => setShowDetailsModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <PageFooter title="Done" onClick={() => {}} />
    </div>
  );
}
