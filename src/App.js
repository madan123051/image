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
  const viewingThisMonth =
    month === today.getMonth() && year === today.getFullYear();
  const todayLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const changeMonth = (offset) => {
    setCurrentDate((date) => moveMonth(date, offset));
  };

  const returnToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const days = [
    ...Array.from({ length: firstDay }, (_, index) => (
      <div key={`empty-${index}`} className="empty-day" aria-hidden="true" />
    )),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const weekday = (firstDay + index) % 7;
      const isToday =
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

      return (
        <time
          key={day}
          className={`calendar-day${isToday ? ' today' : ''}${
            weekday === 0 || weekday === 6 ? ' weekend' : ''
          }`}
          dateTime={`${year}-${String(month + 1).padStart(2, '0')}-${String(
            day
          ).padStart(2, '0')}`}
          aria-current={isToday ? 'date' : undefined}
          aria-label={`${monthName.split(' ')[0]} ${day}, ${year}${
            isToday ? ', today' : ''
          }`}
        >
          <span>{day}</span>
        </time>
      );
    }),
  ];

  return (
    <main className="wildsaura-app">
      <section className="brand-panel" aria-labelledby="wildsaura-title">
        <div className="topographic-lines" aria-hidden="true" />

        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <span className="brand-name">Wildsaura</span>
        </div>

        <div className="brand-copy">
          <p className="eyebrow light">Your wild days, tamed</p>
          <h1 id="wildsaura-title">
            Make room for
            <span> every adventure.</span>
          </h1>
          <p className="brand-intro">
            A calmer way to map the month, protect your time, and leave space
            for the unexpected.
          </p>

          <div className="trail-tags" aria-label="Wildsaura values">
            <span>Plan gently</span>
            <span>Roam freely</span>
          </div>
        </div>

        <div className="mascot-note">
          <span className="note-dot" aria-hidden="true" />
          <p>
            <strong>Rumi's trail note</strong>
            Small steps still cross big forests.
          </p>
        </div>

        <img
          className="wildsaura-mascot"
          src="/assets/wildsaura-mascot.webp"
          alt="Rumi, the Wildsaura dinosaur mascot, surrounded by jungle leaves"
        />
      </section>

      <section className="calendar-panel" aria-label="Wildsaura calendar">
        <header className="calendar-topbar">
          <div>
            <p className="eyebrow">Trail planner</p>
            <p className="today-copy">{todayLabel}</p>
          </div>
          <button
            className="today-button"
            type="button"
            onClick={returnToToday}
            disabled={viewingThisMonth}
          >
            Today
          </button>
        </header>

        <div className="calendar-header">
          <button
            className="month-button"
            type="button"
            aria-label="Previous month"
            onClick={() => changeMonth(-1)}
          >
            <span aria-hidden="true">&#8592;</span>
          </button>
          <div className="month-heading">
            <span aria-hidden="true">Explore</span>
            <h2 aria-live="polite">{monthName}</h2>
          </div>
          <button
            className="month-button"
            type="button"
            aria-label="Next month"
            onClick={() => changeMonth(1)}
          >
            <span aria-hidden="true">&#8594;</span>
          </button>
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <div key={day} className="weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid" aria-label={monthName}>
          {days}
        </div>

        <footer className="calendar-footer">
          <div className="legend">
            <span className="legend-marker" aria-hidden="true" />
            Today
          </div>
          <p>Keep one day open for the wild.</p>
        </footer>
      </section>
    </main>
  );
}

export default App;
