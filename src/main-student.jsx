import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StudentSite } from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StudentSite />
  </StrictMode>,
);
