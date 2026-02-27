import { useEffect, useState } from "react";
import BottomNav from "../../components/BottomNav";
import { useUser } from "../../context/UserContext";
import styles from "./DriverTimeSlot.module.css";

const API_URL = import.meta.env.VITE_API_URL;

interface Order {
  id: number;
  pickup_address: any;
  estimated_pickup_time: string;
  status: string;
}

function DriverTimeSlot() {
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

// ===== Fetch Orders =====
const fetchOrders = async (dateString: string) => {
  setLoading(true);
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (Array.isArray(data)) {
      // 🔥 filter ตามวันที่
      const filtered = data.filter((order: Order) => {
  if (order.status !== "pending") return false;

  const orderDate = new Date(order.estimated_pickup_time);
  const formatted =
    orderDate.getFullYear() +
    "-" +
    String(orderDate.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(orderDate.getDate()).padStart(2, "0");

  return formatted === dateString;
});

      setOrders(filtered);
    } else {
      setOrders([]);
    }
  } catch (err) {
    console.error(err);
    setOrders([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (!selectedDate) return;
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    fetchOrders(`${year}-${month}-${day}`);
  }, [selectedDate]);

  // ===== Calendar Logic from SelectTime =====
  const generateCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const days: { date: Date | null; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startDayOfWeek + i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.sectionHeader}>
            <h1 className={styles.title}>Time Slot</h1>
            <button className={styles.calendarBtn} onClick={() => setIsOpen(true)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
                </svg>
                <span>Calendar</span>
            </button>
        </div>

        <div className={styles.dateDisplay}>
           {selectedDate ? selectedDate.toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' }) : "Select Date"}
        </div>

        {/* ===== Calendar Modal (SelectTime Style) ===== */}
        {isOpen && (
          <div className={styles.calendarOverlay} onClick={() => setIsOpen(false)}>
            <div className={styles.calendarModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.calendarHeader}>
                <button className={styles.calendarNav} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                </button>
                <span className={styles.calendarMonthYear}>
                  {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                </span>
                <button className={styles.calendarNav} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
                </button>
              </div>

              <div className={styles.calendarWeekdays}>
                {dayNames.map(day => <span key={day} className={styles.calendarWeekday}>{day}</span>)}
              </div>

              <div className={styles.calendarDays}>
                {generateCalendarDays().map((day, index) => (
                  <button
                    key={index}
                    className={`${styles.calendarDay} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${day.date?.toDateString() === selectedDate?.toDateString() ? styles.selectedDay : ''}`}
                    onClick={() => { if(day.date) { setSelectedDate(day.date); setIsOpen(false); } }}
                    disabled={!day.isCurrentMonth}
                  >
                    {day.date?.getDate()}
                  </button>
                ))}
              </div>

              <div className={styles.calendarFooter}>
                <button className={styles.calendarTodayBtn} onClick={() => { setSelectedDate(new Date()); setIsOpen(false); }}>Select Today</button>
                <button className={styles.calendarCloseBtn} onClick={() => setIsOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Orders List ===== */}
        {loading ? <p className={styles.message}>Loading...</p> : 
          orders.length === 0 ? <p className={styles.message}>No jobs on this date</p> :
          orders.map((order) => (
            <div key={order.id} className={styles.jobCard}>
              <div className={styles.jobHeader}>
                <div className={styles.jobTitle}>Pickup Job #{order.id}</div>
                <div className={styles.badge}>Pending</div>
              </div>
              <div className={styles.jobTime}>
                {new Date(order.estimated_pickup_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className={styles.jobAddress}>{order.pickup_address?.address || "Pickup location"}</div>
            </div>
          ))
        }
      </div>
      <BottomNav />
    </div>
  );
}

export default DriverTimeSlot;