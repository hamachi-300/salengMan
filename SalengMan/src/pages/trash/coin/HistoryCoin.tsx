import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import styles from './HistoryCoin.module.css';
import { API_URL } from '../../../config/api';
import { useUser } from '../../../context/UserContext';

interface CoinTransaction {
  id: number;
  user_id: string;
  amount: number;
  type: 'buy' | 'use';
  created_at: string;
}

export default function HistoryCoin() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/coins/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to load transactions');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setTransactions(data || []);
    } catch (err) {
      console.error(err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Coin Purchase History" backTo="/account" />

      <div className={styles.content}>
        {loading && <div className={styles.message}>Loading...</div>}
        {error && <div className={styles.error}>{error}</div>}

        {!loading && !error && transactions.length === 0 && (
          <div className={styles.empty}>You have no coin purchases yet.</div>
        )}

        <ul className={styles.list}>
          {transactions.map(tx => (
            <li key={tx.id} className={styles.item}>
              <div className={styles.row}>
                <div className={styles.package}>
                  {tx.type === 'buy' ? 'Purchased Coins' : 'Used Coins'}
                </div>
                <div className={`${styles.status} ${tx.type === 'buy' ? styles.ok : styles.pending}`}>
                  {tx.type.toUpperCase()}
                </div>
              </div>

              <div className={styles.details}>
                <div className={styles.coins}>
                  {tx.type === 'buy' ? '+' : '-'}{tx.amount} coins
                </div>
                {/* Price is not stored in history currently, showing date instead */}
                <div className={styles.date}>{new Date(tx.created_at).toLocaleString()}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
