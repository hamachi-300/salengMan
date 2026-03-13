import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import styles from './CoinDriver.module.css';
import { api } from '../../../config/api';
import { useUser } from '../../../context/UserContext';
import { getToken } from '../../../services/auth';

interface CoinTransaction {
  id: number;
  user_id: string;
  amount: number;
  type: 'earn' | 'use' | 'buy' | 'deposit';
  created_at: string;
  reference_id?: number;
}

export default function CoinDriver() {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshUser();
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        navigate("/signin");
        return;
      }

      const data = await api.getCoinHistory(token);
      setTransactions(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionLabel = (tx: CoinTransaction) => {
    if (tx.type === 'earn') return 'Earned from Trash Disposal';
    if (tx.type === 'buy') return 'Purchased Coins';
    if (tx.type === 'deposit') return 'ESG Carbon Credit Reward';
    if (tx.type === 'use') return 'Used Coins';
    return 'Transaction';
  };

  const getAmountDisplay = (tx: CoinTransaction) => {
    const isPositive = tx.type === 'earn' || tx.type === 'buy' || tx.type === 'deposit';
    return `${isPositive ? '+' : '-'}${tx.amount}`;
  };

  return (
    <div className={styles.page}>
      <PageHeader title="My Coins" backTo="/account" />

      <div className={styles.container}>
        {/* Balance Card */}
        <div className={styles.balanceCard}>
          <div className={styles.balanceLabel}>Current Balance</div>
          <div className={styles.balanceValue}>
            <span className={styles.coinIcon}>🪙</span>
            {user?.coin || 0}
          </div>
          <div className={styles.balanceSubtext}>Total earned from helping the planet</div>
        </div>

        <div className={styles.historySection}>
          <h3 className={styles.sectionTitle}>Transaction History</h3>
          
          {loading ? (
            <div className={styles.loadingWrapper}>
              <div className={styles.spinner}></div>
              <p>Loading transactions...</p>
            </div>
          ) : error ? (
            <div className={styles.errorCard}>{error}</div>
          ) : transactions.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📭</div>
              <p>No transactions yet. Start taking jobs to earn coins!</p>
            </div>
          ) : (
            <div className={styles.transactionList}>
              {transactions.map(tx => (
                <div key={tx.id} className={styles.transactionItem}>
                  <div className={styles.txIconWrapper}>
                    <div className={`${styles.txIcon} ${styles[tx.type]}`}>
                      {tx.type === 'earn' ? '🚛' : tx.type === 'deposit' ? '🌱' : tx.type === 'buy' ? '💰' : '🛒'}
                    </div>
                  </div>
                  <div className={styles.txInfo}>
                    <div className={styles.txLabel}>{getTransactionLabel(tx)}</div>
                    <div className={styles.txDate}>{new Date(tx.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className={`${styles.txAmount} ${styles[tx.type]}`}>
                    {getAmountDisplay(tx)} 🪙
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
