import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OrgSite } from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OrgSite />
  </StrictMode>,
);
