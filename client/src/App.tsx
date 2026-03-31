import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DocsPage from './pages/DocsPage';
import EnvPage from './pages/EnvPage';

import SettingsPage from './pages/SettingsPage';
import type { Agent } from './types';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1 overflow-auto bg-background">
          <Routes>
            <Route path="/" element={<Navigate to="/docs" replace />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/env" element={<EnvPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
