import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';

// ---- Day.js (timezone) ----
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/pt-br';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('pt-br');
dayjs.tz.setDefault('America/Sao_Paulo');

// helpers de data
const fmtDateBR = (d: string | Date) => dayjs.utc(d).tz().format('DD/MM/YYYY');
const toYearMonth = (d: string | Date) => dayjs.utc(d).tz().format('YYYY-MM');

// formatadores BR
const currencyBR = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numberBR = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatCurrencyBR(n: number): string {
  return currencyBR.format(n).replace(/\u00A0/g, ' ');
}
function formatNumberToBR(noSymbol: number): string {
  return numberBR.format(noSymbol);
}
function parseBRLStringToNumber(s: string): number {
  const digits = s.replace(/\D/g, '');
  const asNumber = Number(digits) / 100;
  return isNaN(asNumber) ? 0 : asNumber;
}

// API base
const API = 'http://localhost:3001';

interface Sede {
  id: number;
  nome: string;
}

interface Retirada {
  data: string;             // ISO
  retiradaEventos: number;
  sede: { nome: string };
}

interface Baixa {
  id: number;
  data: string;             // ISO
  valor: number;
  observacao?: string;
  sede: { nome: string };
}

export default function Eventos() {
  // gate simples por senha
  const [authorized, setAuthorized] = useState<boolean>(() => {
    const saved = sessionStorage.getItem('events_access');
    return saved === 'true';
  });
  const [passcode, setPasscode] = useState<string>('');
  const tryAuthorize = (e: FormEvent) => {
    e.preventDefault();
    if (passcode === 'players123') {
      sessionStorage.setItem('events_access', 'true');
      setAuthorized(true);
    } else {
      alert('Senha incorreta.');
    }
  };

  const [retiradas, setRetiradas] = useState<Retirada[]>([]);
  const [baixas, setBaixas] = useState<Baixa[]>([]);
  const [sedeInfo, setSedeInfo] = useState<Sede[]>([]);
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroSede, setFiltroSede] = useState('');
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([]);

  // Formulário de nova baixa (com máscara)
  const [baixaValorStr, setBaixaValorStr] = useState<string>('0,00');
  const baixaValorNum = parseBRLStringToNumber(baixaValorStr);
  const [baixaObs, setBaixaObs] = useState('');
  const [baixaSedeId, setBaixaSedeId] = useState<number>(1);

  // loading ao salvar baixa
  const [savingBaixa, setSavingBaixa] = useState<boolean>(false);

  useEffect(() => {
    if (!authorized) return;
    carregarDados();
  }, [authorized]);

  const carregarDados = async () => {
    const [resRetiradas, resBaixas] = await Promise.all([
      axios.get(`${API}/eventos/retiradas`),
      axios.get(`${API}/eventos/baixas`)
    ]);
    const r: Retirada[] = resRetiradas.data;
    const b: Baixa[] = resBaixas.data;

    setRetiradas(r);
    setBaixas(b);

    // meses únicos combinando retiradas e baixas
    const mesesSet = new Set<string>([...r.map((x) => toYearMonth(x.data)), ...b.map((x) => toYearMonth(x.data))]);
    const meses = Array.from(mesesSet).sort((a, b) => a.localeCompare(b));
    setMesesDisponiveis(meses);

    setSedeInfo([
      { id: 1, nome: 'Alphaville' },
      { id: 2, nome: 'Jd. América' }
    ]);
  };

  const filtrarRetiradas = () => {
    return retiradas
      .filter((r) => {
        const mes = toYearMonth(r.data);
        return (!filtroSede || r.sede.nome === filtroSede) && (!filtroMes || mes === filtroMes);
      })
      .sort((a, b) => dayjs.utc(b.data).valueOf() - dayjs.utc(a.data).valueOf());
  };

  const filtrarBaixas = () => {
    return baixas
      .filter((b) => {
        const mes = toYearMonth(b.data);
        return (!filtroSede || b.sede.nome === filtroSede) && (!filtroMes || mes === filtroMes);
      })
      .sort((a, b) => dayjs.utc(b.data).valueOf() - dayjs.utc(a.data).valueOf());
  };

  const totalRetiradaFiltrada = filtrarRetiradas().reduce((sum, r) => sum + r.retiradaEventos, 0);
  const totalBaixasFiltrado = filtrarBaixas().reduce((sum, b) => sum + b.valor, 0);
  const totalAcumulado = totalRetiradaFiltrada - totalBaixasFiltrado;

  const onChangeBaixaValor = (raw: string) => {
    const onlyDigits = raw.replace(/\D/g, '');
    const cents = onlyDigits === '' ? '0' : onlyDigits;
    const num = Number(cents) / 100;
    setBaixaValorStr(formatNumberToBR(num));
  };

  const registrarBaixa = async (e: FormEvent) => {
    e.preventDefault();
    if (baixaValorNum <= 0) {
      alert('Informe um valor válido');
      return;
    }
    try {
      setSavingBaixa(true);
      await axios.post(`${API}/eventos/baixas`, {
        sedeId: baixaSedeId,
        valor: baixaValorNum,
        observacao: baixaObs
      });
      // reset e recarrega automaticamente
      setBaixaValorStr('0,00');
      setBaixaObs('');
      await carregarDados();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar baixa.');
    } finally {
      setSavingBaixa(false);
    }
  };

  if (!authorized) {
    return (
      <AdminLayout>
        <div className="max-w-sm mx-auto mt-12 bg-pokerGreen p-6 rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-gold mb-4">Acesso restrito</h1>
          <form onSubmit={tryAuthorize} className="space-y-3">
            <input
              type="password"
              placeholder="Digite a senha"
              className="w-full p-2 rounded text-black"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-gold text-black font-bold py-2 rounded hover:opacity-90 transition"
            >
              Entrar
            </button>
            <p className="text-xs text-white/70">Dica: players123</p>
          </form>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gold mb-6">Eventos — Retiradas & Baixas</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <select
          className="p-2 rounded text-black"
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
        >
          <option value="">Todos os meses</option>
          {mesesDisponiveis.map((mes) => (
            <option key={mes} value={mes}>
              {dayjs(`${mes}-01`).tz().format('MMMM [de] YYYY')}
            </option>
          ))}
        </select>

        <select
          className="p-2 rounded text-black"
          value={filtroSede}
          onChange={(e) => setFiltroSede(e.target.value)}
        >
          <option value="">Todas as sedes</option>
          {sedeInfo.map((sede) => (
            <option key={sede.id}>{sede.nome}</option>
          ))}
        </select>
      </div>

      <div className="bg-black border border-gold text-white rounded-xl shadow p-4 mb-6">
        <h2 className="text-lg font-bold text-gold mb-2">Total acumulado de retirada automática</h2>
        <p className="text-3xl font-bold text-white">{formatCurrencyBR(totalAcumulado)}</p>
        <div className="mt-2 text-sm text-white/80">
          <span className="mr-4">Retiradas: <strong>{formatCurrencyBR(totalRetiradaFiltrada)}</strong></span>
          <span>Baixas: <strong>{formatCurrencyBR(totalBaixasFiltrado)}</strong></span>
        </div>
      </div>

      <div className="bg-pokerGreen rounded-xl shadow p-4 mb-10">
        <h2 className="text-lg font-bold text-gold mb-2">Registrar baixa</h2>
        <form onSubmit={registrarBaixa} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <select
            className="p-2 rounded text-black"
            value={baixaSedeId}
            onChange={(e) => setBaixaSedeId(Number(e.target.value))}
          >
            {sedeInfo.map((sede) => (
              <option key={sede.id} value={sede.id}>{sede.nome}</option>
            ))}
          </select>

          <input
            type="text"
            inputMode="numeric"
            placeholder="Valor (R$)"
            className="p-2 rounded text-black"
            value={baixaValorStr}
            onChange={(e) => onChangeBaixaValor(e.target.value)}
          />

          <input
            type="text"
            placeholder="Observação"
            className="p-2 rounded text-black"
            value={baixaObs}
            onChange={(e) => setBaixaObs(e.target.value)}
          />

          <button
            type="submit"
            disabled={savingBaixa || baixaValorNum <= 0}
            className="bg-gold text-black font-bold py-2 px-4 rounded hover:opacity-90 disabled:opacity-60"
          >
            {savingBaixa ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>

      <div className="bg-pokerGreen rounded-xl shadow p-4 mb-10">
        <h2 className="text-lg font-bold text-gold mb-4">Retiradas automáticas</h2>
        <table className="w-full text-sm text-left text-white">
          <thead>
            <tr className="border-b border-gold/30">
              <th className="p-2">Data</th>
              <th className="p-2">Sede</th>
              <th className="p-2">Valor</th>
            </tr>
          </thead>
        <tbody>
            {filtrarRetiradas().map((r, idx) => (
              <tr key={idx} className="border-b border-white/10">
                <td className="p-2">{fmtDateBR(r.data)}</td>
                <td className="p-2">{r.sede.nome}</td>
                <td className="p-2">{formatCurrencyBR(r.retiradaEventos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-pokerGreen rounded-xl shadow p-4">
        <h2 className="text-lg font-bold text-gold mb-4">Histórico de baixas manuais</h2>
        <table className="w-full text-sm text-left text-white">
          <thead>
            <tr className="border-b border-gold/30">
              <th className="p-2">Data</th>
              <th className="p-2">Sede</th>
              <th className="p-2">Valor</th>
              <th className="p-2">Observação</th>
            </tr>
          </thead>
          <tbody>
            {filtrarBaixas().map((b) => (
              <tr key={b.id} className="border-b border-white/10">
                <td className="p-2">{fmtDateBR(b.data)}</td>
                <td className="p-2">{b.sede.nome}</td>
                <td className="p-2">{formatCurrencyBR(b.valor)}</td>
                <td className="p-2">{b.observacao || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

