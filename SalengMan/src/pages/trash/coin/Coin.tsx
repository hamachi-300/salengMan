import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Coin.module.css';
import PageHeader from '../../../components/PageHeader';
import PageFooter from '../../../components/PageFooter';
import ConfirmPopup from '../../../components/ConfirmPopup';
import { useUser } from '../../../context/UserContext';
import { API_URL } from '../../../config/api';

interface Package {
  id: string;
  name: string;
  coins: number;
  price: number;
  period?: string;
  currency?: string;
}

export default function Coin() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [userCoins, setUserCoins] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPurchasedCoins, setLastPurchasedCoins] = useState<number | null>(null);

  // Fetch user's coin balance on component mount
  useEffect(() => {
    if (user) {
      fetchCoinBalance();
    }
    // log resolved API_URL for debugging
    console.log('Resolved API_URL =', API_URL);
  }, [user]);

  const fetchCoinBalance = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/coins/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserCoins(data.balance || 0);
      }
    } catch (error) {
      console.error('Failed to fetch coin balance:', error);
    }
  };

  const allPackages: Package[] = [
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
    },
    {
      id: 'onetime',
      name: '1 Coin Package',
      coins: 1,
      price: 49,
      currency: '฿'
    }
  ];

  const getPackageDetails = (packageId: string | null) => {
    if (!packageId) return null;

    const pkg = [
      ...allPackages
    ].find(p => p.id === packageId);

    return pkg;
  };

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
  };

  const handleConfirmPurchase = async () => {
    // Check if user is logged in
    if (!user) {
      setShowLoginPopup(true);
      return;
    }

    if (selectedPackage) {
      const pkg = getPackageDetails(selectedPackage);
      if (!pkg) {
        alert("Invalid package selected");
        return;
      }

      setIsProcessing(true);

      // Mock purchase success without database connection
      setUserCoins(prev => prev + pkg.coins);
      setLastPurchasedCoins(pkg.coins);
      setShowSuccessPopup(true);
      setIsProcessing(false);
    }
  };

  const handleReadDetails = () => {
    setShowDetailsModal(true);
  };

  const handleLoginRequired = () => {
    setShowLoginPopup(false);
    navigate('/signin');
  };

  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false);
  };

  const handleViewHistory = () => {
    setShowSuccessPopup(false);
    navigate('/coin/history');
  };

  const handleReturnToMain = () => {
    setShowSuccessPopup(false);
    navigate('/trash');
  };

  const selectedPackageDetails = getPackageDetails(selectedPackage);

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
        Limited to 3 large garbage bags per token
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <PageHeader title="Coins & Packages" backTo="/trash" />

      <div className={styles.header}>
        <div className={styles.coinDisplay}>
          <div>
            <div className={styles.coinAmount}>{userCoins} Coins</div>
            <div className={styles.coinInfo}>Your current coin balance</div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Packages */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Packet</div>
          <div className={styles.packageGrid}>
            {allPackages.map(renderPackageItem)}
          </div>
        </div>

        {/* Selected Package Info */}
        {selectedPackageDetails && (
          <div className={styles.selectedPackageInfo}>
            <h3>Selected: {selectedPackageDetails.name}</h3>
            <p style={{ margin: '8px 0', color: '#666' }}>
              Price: <strong>{selectedPackageDetails.price}{selectedPackageDetails.currency}</strong>
            </p>
            <div className={styles.actionButtons}>
              <button className={styles.btnDetails} onClick={handleReadDetails}>
                Read More
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
            </ul>
            <button className={styles.closeBtn} onClick={() => setShowDetailsModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Login Required Popup */}
      <ConfirmPopup
        isOpen={showLoginPopup}
        title="Login Required"
        message="You need to log in to purchase coins. Please sign in to continue."
        onConfirm={handleLoginRequired}
        onCancel={() => setShowLoginPopup(false)}
        confirmText="Login"
        cancelText="Cancel"
        confirmColor="#4CAF50"
      />

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className={styles.successModal} onClick={handleSuccessPopupClose}>
          <div className={styles.successContent} onClick={(e) => e.stopPropagation()}>
            <h3>✓ Purchase Successful!</h3>
            <p>Your coins have been credited to your account.</p>
            <p style={{ margin: '16px 0', fontSize: '14px', color: '#666' }}>
              {lastPurchasedCoins ? `+${lastPurchasedCoins} coins` : `${userCoins} coins added`}
            </p>
            <div className={styles.successActions}>
              <button 
                className={styles.btnSecondary} 
                onClick={handleReturnToMain}
              >
                Return to Main Page
              </button>
              <button 
                className={styles.btnPrimary} 
                onClick={handleViewHistory}
              >
                View Purchase History
              </button>
            </div>
          </div>
        </div>
      )}

      <PageFooter title="Confirm Purchase" onClick={handleConfirmPurchase} />
    </div>
  );
}
