import React, { useState, useEffect } from 'react';

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const calendar = [];
    for (let i = 0; i < firstDay; i++) {
      calendar.push(<div key={`empty-${i}`} className="empty-day"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(
        <div key={day} className="calendar-day">
          {day}
        </div>
      );
    }

    return <div className="calendar-grid">{calendar}</div>;
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}>
          ←
        </button>
        <h2>
          {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
        </h2>
        <button onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}>
          →
        </button>
      </div>
      <div className="calendar-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="weekday">
            {day}
          </div>
        ))}
      </div>
      {renderCalendar()}
    </div>
  );
};

export default Calendar;