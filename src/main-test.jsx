import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TestSite } from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TestSite />
  </StrictMode>,
);
