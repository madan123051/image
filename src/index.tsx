import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { registerServiceWorker } from './serviceWorkerRegistration';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Unable to find the root element.');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

registerServiceWorker();
