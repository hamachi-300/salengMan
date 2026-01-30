import { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

interface PaymentRecord {
  id: string;
  amount: number;
  tokens: number;
  packageName: string;
  status: string;
  createdAt?: any;
}

export default function TransactionsList() {
  const [records, setRecords] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(db, "payments"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const items: PaymentRecord[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setRecords(items);
    });

    return () => unsub();
  }, []);

  return (
    <div className="transactions-list">
      <h2>รายการชำระเงินของฉัน</h2>
      {records.length === 0 ? (
        <p>ยังไม่มีรายการชำระเงิน</p>
      ) : (
        <ul>
          {records.map((r) => (
            <li key={r.id}>
              <strong>{r.packageName}</strong> — {r.amount.toFixed(2)} บาท — {r.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
