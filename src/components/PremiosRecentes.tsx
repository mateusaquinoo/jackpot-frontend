import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/pt-br';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('pt-br');
dayjs.tz.setDefault('America/Sao_Paulo');

// API base (produção/dev via env)
const API = (import.meta.env.VITE_API_URL as string) || '';

interface Premio {
  data: string;            // ISO
  modalidade: string;
  mesa: string;
  mao: string;
  premio: number;
  sede: {
    nome: string;
  };
}

const currencyBR = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatarValor = (v: number) => currencyBR.format(v).replace(/\u00A0/g, ' ');
const formatarData = (iso: string) => dayjs.utc(iso).tz().format('DD/MM/YYYY');

const PremiosRecentes: React.FC = () => {
  const [premios, setPremios] = useState<Premio[]>([]);

  useEffect(() => {
    const fetchPremios = async () => {
      try {
        const res = await fetch(`${API}/saidas/ultimas`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Falha ao buscar últimas saídas');
        const data: Premio[] = await res.json();
        setPremios(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setPremios([]);
      }
    };
    fetchPremios();
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 w-full">
      <h2 className="text-lg font-semibold mb-3 text-gold flex items-center">
        <Trophy className="text-gold inline-block mr-2" size={20} />
        Últimos prêmios pagos
      </h2>

      <ul className="space-y-2">
        {premios.map((p, idx) => (
          <li key={idx} className="border-b pb-2 text-sm text-gray-600">
            <span className="font-medium text-black">{p.mao}</span> em {p.modalidade} {p.mesa} <br />
            <span>{formatarData(p.data)}</span> • {p.sede?.nome ?? '-'} • {formatarValor(p.premio)}
          </li>
        ))}
        {premios.length === 0 && (
          <li className="text-sm text-gray-500">Nenhum prêmio registrado ainda.</li>
        )}
      </ul>
    </div>
  );
};

export default PremiosRecentes;
