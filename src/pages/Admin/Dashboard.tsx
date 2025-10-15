import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';

interface Jackpot {
  sede: string;
  modalidade: string;
  jackpot: number;
}

interface Entrada {
  data: string;
  valorJackpot: number;
  sede: {
    nome: string;
  };
}

interface Saida {
  id: number;
  data: string;
  modalidade: string;
  mesa: string;
  mao: string;
  premio: number;
  sede: {
    nome: string;
  };
}

export default function Dashboard() {
  const [jackpots, setJackpots] = useState<Jackpot[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [ultimos, setUltimos] = useState<Saida[]>([]);
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([]);
  const [filtroMes, setFiltroMes] = useState('');

  useEffect(() => {
    axios.get('http://localhost:3001/jackpot/atual').then((res) => setJackpots(res.data));

    axios.get('http://localhost:3001/entradas').then((res) => {
      const todas = res.data;
      setEntradas(todas);

      const meses: string[] = Array.from(
        new Set<string>(
          todas.map((e: Entrada) => e.data.slice(0, 7))
        )
      );
      setMesesDisponiveis(meses);
    });

    axios.get('http://localhost:3001/saidas/ultimas').then((res) => setUltimos(res.data));
  }, []);

  const entradasFiltradas = entradas.filter((e) => {
    const mes = e.data.slice(0, 7);
    return !filtroMes || mes === filtroMes;
  });

  const totaisPorSede: Record<string, number> = {};
  entradasFiltradas.forEach((e) => {
    totaisPorSede[e.sede.nome] = (totaisPorSede[e.sede.nome] || 0) + e.valorJackpot;
  });

  const formatarValor = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AdminLayout>
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold text-gold mb-6">Painel Geral</h1>

        <div className="flex gap-4 mb-6">
          <select
            className="p-2 rounded text-black"
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
          >
            <option value="">Todos os meses</option>
            {mesesDisponiveis.map((mes) => (
              <option key={mes} value={mes}>
                {new Date(mes + '-01T12:00:00').toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {jackpots.map((item, index) => (
            <div key={index} className="bg-pokerGreen rounded-lg shadow p-4">
              <p className="text-xs uppercase text-gold tracking-wide">
                {item.sede} • {item.modalidade}
              </p>
              <p className="text-2xl font-bold text-white mt-2">
                {formatarValor(item.jackpot)}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-black border border-gold rounded-xl p-4 mb-10">
          <h2 className="text-gold text-lg font-bold mb-2">Total de Jackpot Arrecadado por Sede</h2>
          <ul className="text-sm space-y-1">
            {Object.entries(totaisPorSede).map(([sede, total]) => (
              <li key={sede} className="flex justify-between">
                <span>{sede}</span>
                <span className="font-semibold text-white">{formatarValor(total)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-pokerGreen rounded-xl shadow-lg p-4">
          <h2 className="text-lg font-bold mb-4 text-gold">Últimos prêmios registrados</h2>
          <ul className="space-y-3 text-sm">
            {ultimos.map((s) => (
              <li key={s.id} className="border-b border-gold/30 pb-2">
                <strong>{s.mao}</strong> em <span className="uppercase">{s.modalidade} {s.mesa}</span> <br />
                <span className="text-gray-300">{new Date(s.data).toLocaleDateString()} • {s.sede.nome}</span> <br />
                <span className="text-gold font-semibold">{formatarValor(s.premio)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}