import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import "antd/dist/reset.css";
import 'leaflet/dist/leaflet.css';
import { store } from './store/store';
import { Provider } from 'react-redux';
import "./i18n";
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
    </Provider>
  </StrictMode >,
)