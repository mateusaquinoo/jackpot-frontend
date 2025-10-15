import React from 'react';
import { Coins } from 'lucide-react';

interface JackpotCardProps {
  sede: string;
  modalidade: string;
  valor: number;
}

const JackpotCard: React.FC<JackpotCardProps> = ({ sede, modalidade, valor }) => {
  return (
        <div className="bg-pokerGreen rounded-xl shadow-xl p-6 border border-gold w-full max-w-sm text-center transition transform hover:scale-[1.02]">
       <Coins className="text-gold mr-2" size={18} />
       <p className="text-xs text-gold uppercase tracking-wide">{sede} • {modalidade}</p>
        <p className="text-4xl font-display text-white mt-2">
            R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
        </div>
  );
};

export default JackpotCard;