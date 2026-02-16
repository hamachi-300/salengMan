import { useState } from "react";
import styles from "./SelectTime.module.css";
import { useNavigate } from "react-router-dom";
import { useSell } from "../../context/SellContext";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";

function SelectTime() {
  const navigate = useNavigate();
  const { sellData, setPickupTime } = useSell();

  const isEditing = sellData.editingPostId !== null;

  // Initialize from context if available
  const [selectedDate, setSelectedDate] = useState<string | null>(sellData.pickupTime?.date || null);
  const [startTime, setStartTime] = useState<string>(sellData.pickupTime?.startTime || "");
  const [endTime, setEndTime] = useState<string>(sellData.pickupTime?.endTime || "");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [dateListStart, setDateListStart] = useState(() => {
    if (sellData.pickupTime?.date) {
      return new Date(sellData.pickupTime.date);
    }
    return new Date();
  });

  // Validate time format (HH:MM, 0-24 hours)
  const isValidTimeFormat = (time: string) => {
    const regex = /^([0-1]?[0-9]|2[0-4]):([0-5][0-9])$/;
    if (!regex.test(time)) return false;
    const [hour] = time.split(':').map(Number);
    return hour >= 0 && hour <= 24;
  };

  // Validate end time is after start time
  const isValidTimeRange = () => {
    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) return false;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return endMinutes > startMinutes;
  };

  // Handle time input change
  const handleTimeChange = (value: string, setter: (val: string) => void) => {
    // Allow typing numbers and colon
    const cleaned = value.replace(/[^0-9:]/g, '');

    // Auto-format: add colon after 2 digits
    if (cleaned.length === 2 && !cleaned.includes(':')) {
      setter(cleaned + ':');
    } else if (cleaned.length <= 5) {
      setter(cleaned);
    }
  };

  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate next 7 days from dateListStart
  const generateDates = () => {
    const dates = [];
    const actualToday = new Date();
    actualToday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(dateListStart);
      date.setDate(dateListStart.getDate() + i);

      const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNamesShortList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);

      dates.push({
        id: date.toISOString().split('T')[0],
        day: dayNamesShort[date.getDay()],
        date: date.getDate(),
        month: monthNamesShortList[date.getMonth()],
        isToday: dateOnly.getTime() === actualToday.getTime(),
        isTomorrow: dateOnly.getTime() === actualToday.getTime() + 86400000
      });
    }
    return dates;
  };

  const dates = generateDates();

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Check if a date is in the past
  const isPastDate = (date: Date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();

    const days: { date: Date | null; isCurrentMonth: boolean }[] = [];

    // Previous month days
    for (let i = 0; i < startDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startDayOfWeek + i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month days to fill grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  // Navigate calendar months
  const goToPrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  // Check if prev month button should be disabled
  const isPrevMonthDisabled = () => {
    const prevMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return prevMonth < currentMonth;
  };

  // Handle calendar date click
  const handleCalendarDateClick = (date: Date) => {
    if (!isPastDate(date)) {
      const dateId = date.toISOString().split('T')[0];
      setSelectedDate(dateId);
      // Move date list to start from selected date
      setDateListStart(new Date(date));
      setShowCalendar(false);
    }
  };

  // Check if date is selected
  const isSelectedDate = (date: Date) => {
    if (!selectedDate) return false;
    const dateId = date.toISOString().split('T')[0];
    return dateId === selectedDate;
  };

  // Check if date is today
  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const handleConfirm = () => {
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }

    if (!isValidTimeRange()) {
      alert('End time must be after start time');
      return;
    }

    // Save to context (in-memory only)
    setPickupTime({
      date: selectedDate,
      startTime,
      endTime
    });

    // Navigate to confirmation page
    navigate('/sell/confirm');
  };

  return (
    <div className={styles['page']}>
      <PageHeader title={isEditing ? "Edit Post" : "Post Item"} backTo="/sell/select-address" />

      <div className={styles['content']}>
        {/* Section Title */}
        <div className={styles['section-header']}>
          <h2 className={styles['section-title']}>Select Time</h2>
          <p className={styles['section-subtitle']}>When should we pick up your items?</p>
        </div>

        {/* Date Selection */}
        <div className={styles['section']}>
          <div className={styles['section-label-row']}>
            <span className={styles['section-label']}>Select Date</span>
            <button className={styles['calendar-btn']} onClick={() => setShowCalendar(true)}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
              </svg>
              <span>Calendar</span>
            </button>
          </div>

          <div className={styles['date-list']}>
            {dates.map((date) => (
              <div
                key={date.id}
                className={`${styles['date-card']} ${selectedDate === date.id ? styles['selected'] : ''}`}
                onClick={() => setSelectedDate(date.id)}
              >
                <span className={styles['date-day']}>{date.day}</span>
                <span className={styles['date-number']}>{date.date}</span>
                <span className={styles['date-month']}>{date.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Time Selection */}
        <div className={styles['section']}>
          <span className={styles['section-label']}>Select Time Range</span>

          <div className={styles['time-picker-container']}>
            {/* Start Time */}
            <div className={styles['time-picker-group']}>
              <label className={styles['time-picker-label']}>From</label>
              <div className={styles['time-picker-wrapper']}>
                <svg className={styles['time-picker-icon']} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
                <input
                  type="text"
                  className={`${styles['time-input']} ${!isValidTimeFormat(startTime) && startTime.length > 0 ? styles['input-invalid'] : ''}`}
                  value={startTime}
                  onChange={(e) => handleTimeChange(e.target.value, setStartTime)}
                  placeholder="09:00"
                  maxLength={5}
                />
              </div>
            </div>

            {/* Separator */}
            <div className={styles['time-separator']}>
              <span>-</span>
            </div>

            {/* End Time */}
            <div className={styles['time-picker-group']}>
              <label className={styles['time-picker-label']}>To</label>
              <div className={styles['time-picker-wrapper']}>
                <svg className={styles['time-picker-icon']} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
                <input
                  type="text"
                  className={`${styles['time-input']} ${!isValidTimeFormat(endTime) && endTime.length > 0 ? styles['input-invalid'] : ''}`}
                  value={endTime}
                  onChange={(e) => handleTimeChange(e.target.value, setEndTime)}
                  placeholder="12:00"
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* Time Range Preview */}
          {isValidTimeFormat(startTime) && isValidTimeFormat(endTime) && (
            <div className={`${styles['time-preview']} ${!isValidTimeRange() ? styles['time-invalid'] : ''}`}>
              <span className={styles['time-preview-label']}>Selected time:</span>
              <span className={styles['time-preview-value']}>
                {startTime} - {endTime}
              </span>
              {!isValidTimeRange() && (
                <span className={styles['time-error']}>End time must be after start time</span>
              )}
            </div>
          )}

          <p className={styles['time-hint']}>Enter time in 24-hour format (00:00 - 24:00)</p>
        </div>
      </div>

      {/* Footer Actions */}
      <PageFooter
        title="Confirm"
        onClick={handleConfirm}
        disabled={!selectedDate || !startTime || !endTime}
      />

      {/* Calendar Modal */}
      {showCalendar && (
        <div className={styles['calendar-overlay']} onClick={() => setShowCalendar(false)}>
          <div className={styles['calendar-modal']} onClick={(e) => e.stopPropagation()}>
            {/* Calendar Header */}
            <div className={styles['calendar-header']}>
              <button
                className={`${styles['calendar-nav']} ${isPrevMonthDisabled() ? styles['nav-disabled'] : ''}`}
                onClick={goToPrevMonth}
                disabled={isPrevMonthDisabled()}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>
              <span className={styles['calendar-month-year']}>
                {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </span>
              <button className={styles['calendar-nav']} onClick={goToNextMonth}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </button>
            </div>

            {/* Day Names */}
            <div className={styles['calendar-weekdays']}>
              {dayNames.map(day => (
                <span key={day} className={styles['calendar-weekday']}>{day}</span>
              ))}
            </div>

            {/* Calendar Days */}
            <div className={styles['calendar-days']}>
              {generateCalendarDays().map((day, index) => (
                <button
                  key={index}
                  className={`
                    ${styles['calendar-day']}
                    ${!day.isCurrentMonth ? styles['other-month'] : ''}
                    ${day.date && isPastDate(day.date) ? styles['past-date'] : ''}
                    ${day.date && isToday(day.date) ? styles['today'] : ''}
                    ${day.date && isSelectedDate(day.date) ? styles['selected-day'] : ''}
                  `}
                  onClick={() => day.date && handleCalendarDateClick(day.date)}
                  disabled={!day.date || !day.isCurrentMonth || isPastDate(day.date)}
                >
                  {day.date?.getDate()}
                </button>
              ))}
            </div>

            {/* Calendar Footer */}
            <div className={styles['calendar-footer']}>
              <button
                className={styles['calendar-today-btn']}
                onClick={() => {
                  const todayStr = today.toISOString().split('T')[0];
                  setSelectedDate(todayStr);
                  // Move date list to start from selected date
                  setDateListStart(new Date(today));
                  setShowCalendar(false);
                }}
              >
                Select Today
              </button>
              <button
                className={styles['calendar-close-btn']}
                onClick={() => setShowCalendar(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectTime;
