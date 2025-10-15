import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Public/Home';
import Login from '../pages/Admin/Login';
import AdminDashboard from '../pages/Admin/Dashboard';
import Entradas from '../pages/Admin/Entradas';
import Saidas from '../pages/Admin/Saidas';
import Eventos from '../pages/Admin/Eventos';

const isAuthenticated = () => {
  return localStorage.getItem('admin_token') === 'players_admin';
};

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={isAuthenticated() ? <AdminDashboard /> : <Navigate to="/admin/login" />} />
      <Route path="/admin/entradas" element={isAuthenticated() ? <Entradas /> : <Navigate to="/admin/login" />} />
      <Route path="/admin/saidas" element={isAuthenticated() ? <Saidas /> : <Navigate to="/admin/login" />} />
      <Route path="/admin/eventos" element={isAuthenticated() ? <Eventos /> : <Navigate to="/admin/login"/> } />
    </Routes>
  );
}