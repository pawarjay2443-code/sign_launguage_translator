import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import AppShell from './components/AppShell';
import Landing from './pages/Landing';
import Translator from './pages/Translator';
import LearnISL from './pages/LearnISL';
import Dashboard from './pages/Dashboard';

export function App() {
  const [assistantTrigger, setAssistantTrigger] = useState(0);

  const handleOpenAssistant = () => {
    setAssistantTrigger(prev => prev + 1);
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell onOpenAssistant={handleOpenAssistant} />}>
            <Route index element={<Landing />} />
            <Route path="translator" element={<Translator />} />
            <Route path="learn" element={<LearnISL />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
