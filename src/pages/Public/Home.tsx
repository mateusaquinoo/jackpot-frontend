import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/pt-br';
import { useNavigate } from 'react-router-dom';

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('pt-br');
dayjs.tz.setDefault('America/Sao_Paulo');

const API = 'http://localhost:3001';

interface Jackpot {
  sede: string;
  modalidade: string;
  jackpot: number;
}

interface Premio {
  id: number;
  data: string; // ISO
  modalidade: string;
  mesa: string;
  mao: string;
  premio: number;
  sede: {
    nome: string;
  };
}

const currencyBR = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatar = (valor: number) => currencyBR.format(valor).replace(/\u00A0/g, ' ');

function Home() {
  const [valores, setValores] = useState<Jackpot[]>([]);
  const [premios, setPremios] = useState<Premio[]>([]);
  const navigate = useNavigate();

  // force re-render p/ atualizar dayjs(...).fromNow() sem warning TS
  const [, forceRerender] = useState(0);

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  // ---- Helpers ----
  const fetchJackpotAtual = async () => {
    const res = await fetch(`${API}/jackpot/atual`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao buscar jackpot atual');
    const data = await res.json();
    setValores(data || []);
  };

  const fetchUltimasSaidas = async () => {
    const res = await fetch(`${API}/saidas/ultimas`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao buscar últimas saídas');
    const data: Premio[] = await res.json();
    const sorted = (data || []).slice().sort(
      (a, b) => dayjs.utc(b.data).valueOf() - dayjs.utc(a.data).valueOf()
    );
    setPremios(sorted.slice(0, 5));
  };

  const bootstrap = async () => {
    await Promise.allSettled([fetchJackpotAtual(), fetchUltimasSaidas()]);
  };

  // ---- Efeito principal: SSE (se disponível) + fallback polling ----
  useEffect(() => {
    let sseOk = false;

    const startPolling = () => {
      stopPolling();
      const id = window.setInterval(async () => {
        await Promise.allSettled([fetchUltimasSaidas(), fetchJackpotAtual()]);
      }, 3000);
      pollRef.current = id;
    };

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const trySSE = () => {
      try {
        const es = new EventSource(`${API}/saidas/stream`);
        sseRef.current = es;

        es.onopen = () => {
          sseOk = true;
        };

        es.onmessage = async (ev) => {
          if (ev?.data && ev.data !== 'ping') {
            await Promise.allSettled([fetchUltimasSaidas(), fetchJackpotAtual()]);
          }
        };

        es.onerror = () => {
          es.close();
          sseRef.current = null;
          if (!sseOk) startPolling();
        };
      } catch {
        startPolling();
      }
    };

    bootstrap().finally(trySSE);

    // força re-render do fromNow() a cada 60s
    tickRef.current = window.setInterval(() => {
      forceRerender((n) => n + 1);
    }, 60000);

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      stopPolling();
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, []);

  // ---- Derivados: totais ----
  const totalGeral = useMemo(
    () => valores.reduce((sum, v) => sum + (v?.jackpot || 0), 0),
    [valores]
  );

  const { totalPorSede, totalPorModalidade } = useMemo(() => {
    const sedeAgg: Record<string, number> = {};
    const modAgg: Record<string, number> = {};
    for (const v of valores) {
      if (!v) continue;
      sedeAgg[v.sede] = (sedeAgg[v.sede] || 0) + v.jackpot;
      modAgg[v.modalidade] = (modAgg[v.modalidade] || 0) + v.jackpot;
    }
    return { totalPorSede: sedeAgg, totalPorModalidade: modAgg };
  }, [valores]);

  const ultimo = premios[0];
  const demais = premios.slice(1, 5);

  return (
    <div className="min-h-screen bg-dark text-white font-sans py-8 px-4 relative">
      {/* Logo central */}
      <div className="flex justify-center mb-8 hover:scale-105 transition-transform duration-500 ease-in-out">
        <img src="/logo1.png" alt="Players Logo" className="w-48 sm:w-56 md:w-64 max-w-full" />
      </div>

      <h1 className="text-4xl font-display text-center text-gold mb-10 tracking-wide">
        • JACKPOT •
      </h1>

      <div className="max-w-3xl mx-auto bg-pokerGreen border-2 border-gold rounded-xl p-6 shadow-xl text-center mb-8 animate-pulseGlow">
        <h2 className="text-lg text-gold uppercase tracking-widest mb-2 font-bold">
          Total Geral Acumulado
        </h2>
        <p className="text-5xl font-bold text-white">{formatar(totalGeral)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
        {Object.entries(totalPorSede).map(([sede, total]) => (
          <div key={sede} className="bg-black border border-gold rounded-xl p-6 shadow-md text-center">
            <h2 className="text-sm text-gold uppercase tracking-widest mb-1">Total por Sede</h2>
            <p className="text-lg font-bold text-white">{sede}</p>
            <p className="text-2xl font-bold text-white mt-1">{formatar(total)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
        {Object.entries(totalPorModalidade).map(([modo, total]) => (
          <div key={modo} className="bg-pokerGreen border border-gold rounded-xl p-6 shadow-md text-center">
            <h2 className="text-sm text-gold uppercase tracking-widest mb-1">Total {modo}</h2>
            <p className="text-3xl font-bold text-white mt-1">{formatar(total)}</p>
          </div>
        ))}
      </div>

      {ultimo && (
        <div className="w-full overflow-hidden bg-gold/10 border-y-2 border-gold py-4 mb-10">
          <div className="flex whitespace-nowrap animate-marquee gap-12">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center text-lg font-semibold text-white">
                🎉 Último Prêmio:
                <span className="mx-2 text-white">{ultimo.mao}</span> em{' '}
                <span className="mx-1">{ultimo.modalidade}</span>
                <span className="mx-1">{ultimo.mesa}</span> •
                <span className="text-green-400 font-bold mx-2">{formatar(ultimo.premio)}</span> •{' '}
                {ultimo.sede.nome} • {dayjs.utc(ultimo.data).tz().fromNow()}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-pokerGreen border border-gold rounded-xl shadow-lg p-6 max-w-5xl mx-auto mb-10">
        <h2 className="text-xl font-bold text-gold mb-4 text-center uppercase">Outros Prêmios Recentes</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {demais.map((p) => (
            <li
              key={p.id}
              className="bg-black/40 rounded-lg border border-gold/20 p-4 shadow-md flex flex-col justify-between"
            >
              <div>
                <p className="text-white font-semibold text-base mb-1">
                  {p.mao} em {p.modalidade} {p.mesa}
                </p>
                <p className="text-gray-400 text-sm">
                  {dayjs.utc(p.data).tz().format('DD/MM/YYYY')} • {p.sede.nome}
                </p>
              </div>
              <div className="mt-3">
                <p className="text-green-400 font-bold text-lg">{formatar(p.premio)}</p>
                <p className="text-xs text-gray-400 mt-1">{dayjs.utc(p.data).tz().fromNow()}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="text-center">
          <button
            onClick={() => navigate('/premios')}
            className="text-sm px-4 py-2 border border-gold text-gold rounded hover:bg-gold hover:text-black transition"
          >
            Ver todos os prêmios
          </button>
        </div>
      </div>

      <div className="bg-black/40 border border-gold rounded-xl shadow-lg p-6 max-w-6xl mx-auto mb-20">
        <h2 className="text-xl font-bold text-gold mb-4 text-center uppercase">
          Tabela de Pagamentos por Mão e Blind
        </h2>

        <div className="overflow-x-auto text-sm">
          <table className="min-w-full text-left text-white border-collapse">
            <thead>
              <tr className="text-gold border-b border-gold/30">
                <th className="p-2">Modalidade</th>
                <th className="p-2">Blind</th>
                <th className="p-2">Mão</th>
                <th className="p-2">Valor (R$)</th>
                <th className="p-2">% do Jackpot</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-pokerGreen text-white font-semibold">
                <td className="p-2">Texas</td><td className="p-2">1-2</td><td className="p-2">Quadra</td><td className="p-2">R$ 50,00</td><td className="p-2">-</td>
              </tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Quadra</td><td className="p-2">R$ 200,00</td><td className="p-2">-</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Quadra</td><td className="p-2">R$ 500,00</td><td className="p-2">-</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Quadra</td><td className="p-2">R$ 1.000,00</td><td className="p-2">-</td></tr>
              <tr><td></td><td className="p-2">1-2</td><td className="p-2">Straight Flush</td><td className="p-2">-</td><td className="p-2">0,90%</td></tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Straight Flush</td><td className="p-2">-</td><td className="p-2">1,350%</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Straight Flush</td><td className="p-2">-</td><td className="p-2">2,70%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Straight Flush</td><td className="p-2">-</td><td className="p-2">5,4%</td></tr>

              <tr><td></td><td className="p-2">1-2</td><td className="p-2">Royal Straight Flush</td><td className="p-2">-</td><td className="p-2">2,5%</td></tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Royal Straight Flush</td><td className="p-2">-</td><td className="p-2">3,75%</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Royal Straight Flush</td><td className="p-2">-</td><td className="p-2">7,5%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Royal Straight Flush</td><td className="p-2">-</td><td className="p-2">15%</td></tr>

              <tr className="bg-pokerRed/40 text-white font-semibold">
                <td className="p-2">Omaha</td><td className="p-2">1-2</td><td className="p-2">Straight Flush</td><td className="p-2">R$ 250,00</td><td className="p-2">-</td>
              </tr>
               <tr><td></td><td className="p-2">5-5</td><td className="p-2">Straight Flush</td><td className="p-2">R$ 750,00</td><td className="p-2">-</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Straight Flush</td><td className="p-2">R$ 1.000,00</td><td className="p-2">-</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Straight Flush</td><td className="p-2">R$ 2.000,00</td><td className="p-2">-</td></tr>

              <tr><td></td><td className="p-2">1-2</td><td className="p-2">Royal Straight Flush</td><td className="p-2">-</td><td className="p-2">1,2%</td></tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Royal Straight Flush</td><td className="p-2">-</td><td className="p-2">1,8%</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Royal Straight Flush</td><td className="p-2">-</td><td className="p-2">3,6%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Royal Straight Flush</td><td className="p-2">-</td><td className="p-2">7,2%</td></tr>

              <tr className="bg-pokerGreen/30 text-white font-semibold">
                <td className="p-2">Cooler Texas</td><td className="p-2">1-2</td><td className="p-2">Quadra x Quadra</td><td className="p-2">-</td><td className="p-2">4%</td>
              </tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Quadra x Quadra</td><td className="p-2">-</td><td className="p-2">6%</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Quadra x Quadra</td><td className="p-2">-</td><td className="p-2">12%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Quadra x Quadra</td><td className="p-2">-</td><td className="p-2">24%</td></tr>

              <tr><td></td><td className="p-2">1-2</td><td className="p-2">Quadra x Straight</td><td className="p-2">-</td><td className="p-2">6%</td></tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Quadra x Straight</td><td className="p-2">-</td><td className="p-2">8%</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Quadra x Straight</td><td className="p-2">-</td><td className="p-2">16%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Quadra x Straight</td><td className="p-2">-</td><td className="p-2">32%</td></tr>

              <tr><td></td><td className="p-2">1-2</td><td className="p-2">Straight x Straight</td><td className="p-2">-</td><td className="p-2">7,5%</td></tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Straight x Straight</td><td className="p-2">-</td><td className="p-2">10%</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Straight x Straight</td><td className="p-2">-</td><td className="p-2">20%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Straight x Straight</td><td className="p-2">-</td><td className="p-2">40%</td></tr>

              <tr><td></td><td className="p-2">1-2</td><td className="p-2">Royal x Quadra</td><td className="p-2">-</td><td className="p-2">10%</td></tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Royal x Quadra</td><td className="p-2">-</td><td className="p-2">15%</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Royal x Quadra</td><td className="p-2">-</td><td className="p-2">30%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Royal x Quadra</td><td className="p-2">-</td><td className="p-2">60%</td></tr>

              <tr><td></td><td className="p-2">1-2</td><td className="p-2">Royal x Straight</td><td className="p-2">-</td><td className="p-2">17%</td></tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Royal x Straight</td><td className="p-2">-</td><td className="p-2">25%</td></tr>
              <tr><td></td><td className="p-2">5-1</td><td className="p-2">Royal x Straight</td><td className="p-2">-</td><td className="p-2">50%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Royal x Straight</td><td className="p-2">-</td><td className="p-2">100%</td></tr>

              <tr className="bg-pokerRed/30 text-white font-semibold">
                <td className="p-2">Cooler Omaha</td><td className="p-2">1-2</td><td className="p-2">Quadra x Quadra</td><td className="p-2"></td><td className="p-2">2%</td>
              </tr>
                 <tr><td></td><td className="p-2">5-5</td><td className="p-2">Quadra x Quadra</td><td className="p-2">-</td><td className="p-2">3%</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Quadra x Quadra</td><td className="p-2">-</td><td className="p-2">6%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Quadra x Quadra</td><td className="p-2">-</td><td className="p-2">12%</td></tr>

              <tr><td></td><td className="p-2">1-2</td><td className="p-2">Quadra x Straight</td><td className="p-2">-</td><td className="p-2">3%</td></tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Quadra x Straight</td><td className="p-2">-</td><td className="p-2">4,5%</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Quadra x Straight</td><td className="p-2">-</td><td className="p-2">9%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Quadra x Straight</td><td className="p-2">-</td><td className="p-2">18%</td></tr>

              <tr><td></td><td className="p-2">1-2</td><td className="p-2">Straight x Straight</td><td className="p-2">-</td><td className="p-2">4,5%</td></tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Straight x Straight</td><td className="p-2">-</td><td className="p-2">6%</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Straight x Straight</td><td className="p-2">-</td><td className="p-2">12%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Straight x Straight</td><td className="p-2">-</td><td className="p-2">24%</td></tr>

              <tr><td></td><td className="p-2">1-2</td><td className="p-2">Royal x Quadra</td><td className="p-2">-</td><td className="p-2">6%</td></tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Royal x Quadra</td><td className="p-2">-</td><td className="p-2">9%</td></tr>
              <tr><td></td><td className="p-2">5-10</td><td className="p-2">Royal x Quadra</td><td className="p-2">-</td><td className="p-2">18%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Royal x Quadra</td><td className="p-2">-</td><td className="p-2">36%</td></tr>

              <tr><td></td><td className="p-2">1-2</td><td className="p-2">Royal x Straight</td><td className="p-2">-</td><td className="p-2">9%</td></tr>
              <tr><td></td><td className="p-2">5-5</td><td className="p-2">Royal x Straight</td><td className="p-2">-</td><td className="p-2">13,5%</td></tr>
              <tr><td></td><td className="p-2">5-1</td><td className="p-2">Royal x Straight</td><td className="p-2">-</td><td className="p-2">27%</td></tr>
              <tr><td></td><td className="p-2">10-25+</td><td className="p-2">Royal x Straight</td><td className="p-2">-</td><td className="p-2">54%</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Home;
