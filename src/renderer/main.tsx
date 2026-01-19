import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log('main.tsx: Starting React app...');

try {
  const container = document.getElementById('root');
  console.log('main.tsx: Root element found:', container);

  if (!container) {
    throw new Error('Root element not found!');
  }

  const root = createRoot(container);
  root.render(<App />);

  console.log('main.tsx: React app rendered successfully');
} catch (error) {
  console.error('main.tsx: Error rendering React app:', error);
}