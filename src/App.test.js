import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

describe('App language switcher', () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('switches from the Gregorian calendar to a localized Bikram Sambat calendar', () => {
    act(() =>
      root.render(
        React.createElement(App, { initialDate: new Date(2024, 6, 24) })
      )
    );

    expect(container.querySelector('.month-heading h2').textContent).toBe(
      'July 2024'
    );
    expect(container.querySelectorAll('.calendar-day')).toHaveLength(31);

    const nepaliButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'नेपाली'
    );

    act(() =>
      nepaliButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    );

    expect(container.querySelector('.month-heading h2').textContent).toBe(
      'साउन २०८१'
    );
    expect(container.querySelectorAll('.calendar-day')).toHaveLength(32);
    expect(container.querySelector('.calendar-topbar .eyebrow').textContent).toBe(
      'यात्रा योजनाकार'
    );
    expect(document.documentElement.lang).toBe('ne');
  });
});
