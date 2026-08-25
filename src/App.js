import { useState } from 'react';
import { getMonthDetails, moveMonth } from './calendar';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function App({ initialDate = new Date() }) {
  const [currentDate, setCurrentDate] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const { firstDay, daysInMonth } = getMonthDetails(currentDate);
  const today = new Date();

  const changeMonth = (offset) => {
    setCurrentDate((date) => moveMonth(date, offset));
  };

  const days = [
    ...Array.from({ length: firstDay }, (_, index) => (
      <div key={`empty-${index}`} className="empty-day" aria-hidden="true" />
    )),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const isToday =
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

      return (
        <time
          key={day}
          className={`calendar-day${isToday ? ' today' : ''}`}
          dateTime={`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
          aria-current={isToday ? 'date' : undefined}
        >
          {day}
        </time>
      );
    }),
  ];

  return (
    <main className="calendar-container" aria-label="Calendar">
      <header className="calendar-header">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => changeMonth(-1)}
        >
          &#8592;
        </button>
        <h1 aria-live="polite">{monthName}</h1>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => changeMonth(1)}
        >
          &#8594;
        </button>
      </header>

      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <div key={day} className="weekday">
            {day}
          </div>
        ))}
      </div>
      <div className="calendar-grid">{days}</div>
    </main>
  );
}

export default App;
