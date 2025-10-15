import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [senha, setSenha] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (senha === '123') {
      localStorage.setItem('admin_token', 'players_admin');
      navigate('/admin');
    } else {
      alert('Senha incorreta');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <form onSubmit={handleLogin} className="bg-pokerGreen p-6 rounded-xl shadow-lg space-y-4 w-full max-w-sm">
        <h2 className="text-xl font-bold text-center text-gold">Painel Administrativo</h2>
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full p-2 rounded text-black"
        />
        <button type="submit" className="w-full bg-gold text-black font-semibold py-2 rounded">
          Entrar
        </button>
      </form>
    </div>
  );
}