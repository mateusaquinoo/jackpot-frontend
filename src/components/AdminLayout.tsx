import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-pokerGreen border-b border-gold p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gold tracking-widest uppercase">
          Painel Players Poker Club
        </h1>
        <button onClick={logout} className="text-sm text-gold hover:underline">
          Sair
        </button>
      </header>

      <nav className="bg-pokerGreen border-b border-gold px-4 py-2 flex gap-4 text-sm text-white">
        <Link to="/admin" className="hover:text-gold">Dashboard</Link>
        <Link to="/admin/entradas" className="hover:text-gold">Entradas</Link>
        <Link to="/admin/saidas" className="hover:text-gold">Saídas</Link>
        <Link to="/admin/eventos" className="hover:text-gold">Eventos</Link>
      </nav>

      <main className="p-6">{children}</main>
    </div>
  );
}