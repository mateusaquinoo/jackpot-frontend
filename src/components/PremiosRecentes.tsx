import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

interface Premio {
  data: string;
  modalidade: string;
  mesa: string;
  mao: string;
  premio: number;
  sede: {
    nome: string;
  };
}

const PremiosRecentes: React.FC = () => {
  const [premios, setPremios] = useState<Premio[]>([]);

  useEffect(() => {
    fetch('http://localhost:3001/saidas/ultimas')
      .then(res => res.json())
      .then(data => setPremios(data));
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
            <span>{new Date(p.data).toLocaleDateString()}</span> • {p.sede.nome} • R$ {p.premio.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PremiosRecentes;