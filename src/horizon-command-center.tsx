import React from 'react';
import { createRoot } from 'react-dom/client';
import { HorizonAI } from './horizon-ai';
import './horizon-clean.css';

type Prospect = { id: string; name: string; handle: string; niche: string; score: number | null; status: string; reply: string; time: string };
const STORAGE_KEY = 'hw-outreach-prospects';

function readProspects(): Prospect[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function App() {
  const [prospects, setProspects] = React.useState<Prospect[]>(readProspects);

  React.useEffect(() => {
    const sync = () => setProspects(readProspects());
    window.addEventListener('storage', sync);
    const interval = window.setInterval(sync, 1500);
    return () => {
      window.removeEventListener('storage', sync);
      window.clearInterval(interval);
    };
  }, []);

  return <div className="horizon-os"><HorizonAI prospects={prospects} /></div>;
}

const mount = document.createElement('div');
mount.id = 'horizon-command-center';
document.body.appendChild(mount);
createRoot(mount).render(<App />);
