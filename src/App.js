import { useEffect, useState } from 'react';
import { getMonthDetails, moveMonth } from './calendar';
import {
  NEPALI_MONTHS,
  canMoveNepaliMonth,
  getGregorianDateForNepaliDay,
  getNepaliDate,
  getNepaliMonthDetails,
  moveNepaliMonth,
  toNepaliNumerals,
} from './nepaliCalendar';

const COPY = {
  en: {
    documentTitle: 'Wildsaura — Trail Planner',
    brandTagline: 'Your wild days, tamed',
    headline: 'Make room for',
    headlineAccent: 'every adventure.',
    intro:
      'A calmer way to map the month, protect your time, and leave space for the unexpected.',
    planGently: 'Plan gently',
    roamFreely: 'Roam freely',
    noteTitle: "Rumi's trail note",
    noteBody: 'Small steps still cross big forests.',
    trailPlanner: 'Trail planner',
    today: 'Today',
    explore: 'Explore',
    footer: 'Keep one day open for the wild.',
    languageLabel: 'Language',
    calendarLabel: 'Wildsaura Gregorian calendar',
    mascotAlt:
      'Rumi, the Wildsaura dinosaur mascot, surrounded by jungle leaves',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
  ne: {
    documentTitle: 'वाइल्डसौरा — यात्रा योजनाकार',
    brandTagline: 'तपाईंका व्यस्त दिन, सहज बनाऔँ',
    headline: 'हरेक यात्राका लागि',
    headlineAccent: 'समय निकाल्नुहोस्।',
    intro:
      'महिनाको योजना शान्तसँग बनाउनुहोस्, आफ्नो समय जोगाउनुहोस् र आकस्मिक यात्राका लागि ठाउँ छोड्नुहोस्।',
    planGently: 'सहज योजना',
    roamFreely: 'स्वतन्त्र यात्रा',
    noteTitle: 'रुमीको बाटोको सन्देश',
    noteBody: 'सानो पाइला पनि ठूलो जंगल पार गर्छ।',
    trailPlanner: 'यात्रा योजनाकार',
    today: 'आज',
    explore: 'हेर्नुहोस्',
    footer: 'एउटा दिन स्वतन्त्र यात्राका लागि खाली राख्नुहोस्।',
    languageLabel: 'भाषा',
    calendarLabel: 'वाइल्डसौरा नेपाली पात्रो',
    mascotAlt: 'जङ्गलका पातहरूले घेरिएको वाइल्डसौराको डायनासोर रुमी',
    weekdays: ['आइत', 'सोम', 'मङ्गल', 'बुध', 'बिही', 'शुक्र', 'शनि'],
  },
};

const FULL_NEPALI_WEEKDAYS = [
  'आइतबार',
  'सोमबार',
  'मङ्गलबार',
  'बुधबार',
  'बिहीबार',
  'शुक्रबार',
  'शनिबार',
];

function App({ initialDate = new Date() }) {
  const [language, setLanguage] = useState('en');
  const [currentDate, setCurrentDate] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );
  const [nepaliMonth, setNepaliMonth] = useState(() => {
    const date = getNepaliDate(initialDate);
    return { year: date.year, month: date.month };
  });

  const isNepali = language === 'ne';
  const copy = COPY[language];
  const today = new Date();
  const todayNepali = getNepaliDate(today);
  const gregorianYear = currentDate.getFullYear();
  const gregorianMonth = currentDate.getMonth();
  const displayedYear = isNepali ? nepaliMonth.year : gregorianYear;
  const displayedMonth = isNepali ? nepaliMonth.month : gregorianMonth + 1;
  const { firstDay, daysInMonth } = isNepali
    ? getNepaliMonthDetails(nepaliMonth.year, nepaliMonth.month)
    : getMonthDetails(currentDate);
  const monthName = isNepali
    ? `${NEPALI_MONTHS[nepaliMonth.month - 1]} ${toNepaliNumerals(
        nepaliMonth.year
      )}`
    : currentDate.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      });
  const viewingThisMonth = isNepali
    ? nepaliMonth.month === todayNepali.month &&
      nepaliMonth.year === todayNepali.year
    : gregorianMonth === today.getMonth() &&
      gregorianYear === today.getFullYear();
  const todayLabel = isNepali
    ? `${FULL_NEPALI_WEEKDAYS[today.getDay()]}, ${toNepaliNumerals(
        todayNepali.day
      )} ${NEPALI_MONTHS[todayNepali.month - 1]} ${toNepaliNumerals(
        todayNepali.year
      )}`
    : today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = copy.documentTitle;
  }, [copy.documentTitle, language]);

  const changeMonth = (offset) => {
    if (isNepali) {
      setNepaliMonth((date) =>
        canMoveNepaliMonth(date, offset) ? moveNepaliMonth(date, offset) : date
      );
      return;
    }

    setCurrentDate((date) => moveMonth(date, offset));
  };

  const returnToToday = () => {
    if (isNepali) {
      setNepaliMonth({ year: todayNepali.year, month: todayNepali.month });
      return;
    }

    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const days = [
    ...Array.from({ length: firstDay }, (_, index) => (
      <div key={`empty-${index}`} className="empty-day" aria-hidden="true" />
    )),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const weekday = (firstDay + index) % 7;
      const isToday = isNepali
        ? day === todayNepali.day &&
          displayedMonth === todayNepali.month &&
          displayedYear === todayNepali.year
        : day === today.getDate() &&
          displayedMonth === today.getMonth() + 1 &&
          displayedYear === today.getFullYear();
      const dateTime = isNepali
        ? getGregorianDateForNepaliDay(displayedYear, displayedMonth, day).iso
        : `${displayedYear}-${String(displayedMonth).padStart(2, '0')}-${String(
            day
          ).padStart(2, '0')}`;
      const visibleDay = isNepali ? toNepaliNumerals(day) : day;
      const accessibleDate = isNepali
        ? `${toNepaliNumerals(day)} ${monthName}${isToday ? ', आज' : ''}`
        : `${monthName.split(' ')[0]} ${day}, ${displayedYear}${
            isToday ? ', today' : ''
          }`;

      return (
        <time
          key={day}
          className={`calendar-day${isToday ? ' today' : ''}${
            weekday === 0 || weekday === 6 ? ' weekend' : ''
          }`}
          dateTime={dateTime}
          aria-current={isToday ? 'date' : undefined}
          aria-label={accessibleDate}
        >
          <span>{visibleDay}</span>
        </time>
      );
    }),
  ];

  return (
    <main className={`wildsaura-app language-${language}`}>
      <section className="brand-panel" aria-labelledby="wildsaura-title">
        <div className="topographic-lines" aria-hidden="true" />

        <div className="brand-topbar">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              W
            </span>
            <span className="brand-name">Wildsaura</span>
          </div>

          <div
            className="language-switcher"
            role="group"
            aria-label={copy.languageLabel}
          >
            <button
              type="button"
              className={language === 'en' ? 'active' : ''}
              aria-pressed={language === 'en'}
              onClick={() => setLanguage('en')}
            >
              English
            </button>
            <button
              type="button"
              className={language === 'ne' ? 'active' : ''}
              aria-pressed={language === 'ne'}
              onClick={() => setLanguage('ne')}
              lang="ne"
            >
              नेपाली
            </button>
          </div>
        </div>

        <div className="brand-copy">
          <p className="eyebrow light">{copy.brandTagline}</p>
          <h1 id="wildsaura-title">
            {copy.headline}
            <span>{copy.headlineAccent}</span>
          </h1>
          <p className="brand-intro">{copy.intro}</p>

          <div className="trail-tags" aria-label="Wildsaura values">
            <span>{copy.planGently}</span>
            <span>{copy.roamFreely}</span>
          </div>
        </div>

        <div className="mascot-note">
          <span className="note-dot" aria-hidden="true" />
          <p>
            <strong>{copy.noteTitle}</strong>
            {copy.noteBody}
          </p>
        </div>

        <img
          className="wildsaura-mascot"
          src="/assets/wildsaura-mascot.webp"
          alt={copy.mascotAlt}
        />
      </section>

      <section className="calendar-panel" aria-label={copy.calendarLabel}>
        <header className="calendar-topbar">
          <div>
            <p className="eyebrow">{copy.trailPlanner}</p>
            <p className="today-copy">{todayLabel}</p>
          </div>
          <button
            className="today-button"
            type="button"
            onClick={returnToToday}
            disabled={viewingThisMonth}
          >
            {copy.today}
          </button>
        </header>

        <div className="calendar-header">
          <button
            className="month-button"
            type="button"
            aria-label={isNepali ? 'अघिल्लो महिना' : 'Previous month'}
            onClick={() => changeMonth(-1)}
            disabled={
              isNepali && !canMoveNepaliMonth(nepaliMonth, -1)
            }
          >
            <span aria-hidden="true">&#8592;</span>
          </button>
          <div className="month-heading">
            <span aria-hidden="true">{copy.explore}</span>
            <h2 aria-live="polite">{monthName}</h2>
          </div>
          <button
            className="month-button"
            type="button"
            aria-label={isNepali ? 'अर्को महिना' : 'Next month'}
            onClick={() => changeMonth(1)}
            disabled={isNepali && !canMoveNepaliMonth(nepaliMonth, 1)}
          >
            <span aria-hidden="true">&#8594;</span>
          </button>
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          {copy.weekdays.map((day) => (
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
            {copy.today}
          </div>
          <p>{copy.footer}</p>
        </footer>
      </section>
    </main>
  );
}

export default App;
