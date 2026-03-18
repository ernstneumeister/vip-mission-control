import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TasksPage from './pages/TasksPage';
import TaskDetail from './pages/TaskDetail';
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
        <main className="flex-1 overflow-auto bg-[#FAFAFA]">
          <Routes>
            <Route path="/" element={<Navigate to="/tasks" replace />} />
            <Route path="/tasks" element={<TasksPage agents={agents} searchQuery={searchQuery} />} />
            <Route path="/tasks/:id" element={<TaskDetail agents={agents} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
