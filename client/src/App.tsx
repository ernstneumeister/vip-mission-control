import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TasksPage from './pages/TasksPage';
import TaskDetail from './pages/TaskDetail';
import CronDetailPage from './pages/CronDetailPage';
import DocsPage from './pages/DocsPage';
import EnvPage from './pages/EnvPage';
import SettingsPage from './pages/SettingsPage';
import type { Agent } from './types';
import { getAgents } from './api';

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getAgents().then(setAgents);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1 overflow-auto bg-background">
          <Routes>
            <Route path="/" element={<Navigate to="/tasks" replace />} />
            <Route path="/tasks" element={<TasksPage agents={agents} searchQuery={searchQuery} />} />
            <Route path="/tasks/:id" element={<TaskDetail agents={agents} />} />
            <Route path="/cron/:id" element={<CronDetailPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/env" element={<EnvPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
