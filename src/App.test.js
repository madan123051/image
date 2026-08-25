import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

describe('Aayoj application shell', () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener: () => {}, removeListener: () => {} }));
    window.scrollTo = () => {};
    window.location.hash = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders Today and switches the language with its calendar system', () => {
    act(() => root.render(<App />));
    expect(container.querySelector('.today-page h1').textContent).toContain('Good to see you');
    expect(container.querySelectorAll('.summary-strip > *')).toHaveLength(4);

    const languageButton = container.querySelector('.language-button');
    act(() => languageButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('.today-page h1').textContent).toContain('फेरि भेटेर खुसी लाग्यो');
    expect(languageButton.textContent).toContain('बि.सं.');
    expect(document.documentElement.lang).toBe('ne');
  });

  it('opens the global quick-add confirmation flow', () => {
    act(() => root.render(<App />));
    const addButton = container.querySelector('.sidebar-add');
    act(() => addButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(document.body.querySelector('.quick-add-dialog')).not.toBeNull();
    expect(document.body.querySelector('.natural-add')).not.toBeNull();
  });

  it('offers Google login without the old Firebase sidebar status line', () => {
    act(() => root.render(<App />));
    const profileButton = container.querySelector('.profile-button');
    act(() => profileButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(document.body.querySelector('.google-auth-button').textContent).toContain('Continue with Google');
    expect(container.querySelector('.storage-note')).toBeNull();
    expect(container.textContent).not.toContain('Firebase workspace');
  });
});
