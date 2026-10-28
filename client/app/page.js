'use client';
import { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import api from './lib/api';

export default function Home() {
  const [user, setUser] = useState(null);
  const [homes, setHomes] = useState([]);
  const [currentHome, setCurrentHome] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHomes = async () => {
    try {
      const res = await api.get('/api/homes');
      setHomes(res.data);
      setCurrentHome(prev => {
        if (prev) {
          const still = res.data.find(h => h._id === prev._id);
          return still || res.data[0];
        }
        return res.data[0] || null;
      });
    } catch (err) {
      console.error('Failed to fetch homes', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      fetchHomes().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    await fetchHomes();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setHomes([]);
    setCurrentHome(null);
  };

  const handleUserUpdate = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleHomeChange = (home) => {
    setCurrentHome(home);
  };

  const handleHomesUpdate = async () => {
    await fetchHomes();
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-green-400 text-xl">Loading...</div>
    </div>
  );

  if (!user) return <AuthPage onLogin={handleLogin} />;

  if (!currentHome) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-green-400 text-xl">Setting up...</div>
    </div>
  );

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onUserUpdate={handleUserUpdate}
      homes={homes}
      currentHome={currentHome}
      onHomeChange={handleHomeChange}
      onHomesUpdate={handleHomesUpdate}
    />
  );
}
