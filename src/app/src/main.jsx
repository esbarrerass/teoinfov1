import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import MeasurementPage from './pages/MeasurementPage.jsx';
import ProcessPage from './pages/ProcessPage.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/medicion" element={<MeasurementPage />} />
        <Route path="/proceso" element={<ProcessPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
