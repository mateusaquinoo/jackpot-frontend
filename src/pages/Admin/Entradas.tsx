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

// formatadores numéricos BR
const currencyBR = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numberBR = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function parseBRLStringToNumber(s: string): number {
  const digits = s.replace(/\D/g, '');
  const asNumber = Number(digits) / 100;
  return isNaN(asNumber) ? 0 : asNumber;
}

function formatNumberToBR(noSymbol: number): string {
  return numberBR.format(noSymbol);
}

function formatCurrencyBR(n: number): string {
  return currencyBR.format(n).replace(/\u00A0/g, ' ');
}

// API base (ajuste a porta se necessário)
const API = 'http://localhost:3001';

interface Sede {
  id: number;
  nome: string;
}

interface Entrada {
  id: number;
  data: string; // ISO
  modalidade: string;
  valorArrecadado: number;
  retiradaEventos: number;
  gerente: string;
  valorJackpot: number;
  sede: {
    nome: string;
  };
}

export default function Entradas() {
  const [sedeId, setSedeId] = useState<number>(1);
  const [modalidade, setModalidade] = useState<'Texas' | 'Omaha'>('Texas');

  // Campo de valor com máscara (texto) + derivado numérico
  const [valorArrecadadoStr, setValorArrecadadoStr] = useState<string>('0,00');
  const valorArrecadadoNum = parseBRLStringToNumber(valorArrecadadoStr);

  const [gerente, setGerente] = useState('');
  const [retirada, setRetirada] = useState<number>(0);

  const [sedeInfo, setSedeInfo] = useState<Sede[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([]);

  // filtros
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroGerente, setFiltroGerente] = useState('');

  // criação: loading
  const [savingCreate, setSavingCreate] = useState<boolean>(false);

  // edição (inline)
  const [editId, setEditId] = useState<number | null>(null);
  const [editModalidade, setEditModalidade] = useState<'Texas' | 'Omaha'>('Texas');
  const [editValorStr, setEditValorStr] = useState<string>('0,00'); // máscara em edição
  const editValorNum = parseBRLStringToNumber(editValorStr);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // estado original do item em edição (para detectar mudanças)
  const [originalEdit, setOriginalEdit] = useState<{ modalidade: 'Texas' | 'Omaha'; valor: number } | null>(null);

  useEffect(() => {
    setSedeInfo([
      { id: 1, nome: 'Alphaville' },
      { id: 2, nome: 'Jd. América' }
    ]);
    carregarEntradas();
  }, []);

  useEffect(() => {
    const retiradaFixa = sedeId === 1 ? 500 : 750;
    const base = valorArrecadadoNum;
    setRetirada(base < retiradaFixa ? base : retiradaFixa);
  }, [valorArrecadadoNum, sedeId]);

  const carregarEntradas = async () => {
    const res = await axios.get(`${API}/entradas`);
    const todas: Entrada[] = res.data;

    const meses = Array.from(new Set(todas.map((e) => toYearMonth(e.data)))).sort((a, b) =>
      a.localeCompare(b)
    );

    setEntradas(todas);
    setMesesDisponiveis(meses);
  };

  const onChangeValorArrecadado = (raw: string) => {
    const onlyDigits = raw.replace(/\D/g, '');
    const cents = onlyDigits === '' ? '0' : onlyDigits;
    const num = Number(cents) / 100;
    setValorArrecadadoStr(formatNumberToBR(num));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSavingCreate(true);
      const dataISO = dayjs().utc().toISOString();

      await axios.post(`${API}/entradas`, {
        data: dataISO,
        sedeId,
        modalidade,
        valorArrecadado: valorArrecadadoNum,
        gerente
      });

      // reset
      setValorArrecadadoStr('0,00');
      setGerente('');
      await carregarEntradas();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.error || 'Erro ao cadastrar entrada.';
      alert(msg);
    } finally {
      setSavingCreate(false);
    }
  };

  const startEdit = (entrada: Entrada) => {
    setEditId(entrada.id);
    const modal = entrada.modalidade === 'Omaha' ? 'Omaha' : 'Texas';
    setEditModalidade(modal);
    setEditValorStr(formatNumberToBR(entrada.valorArrecadado));
    setOriginalEdit({ modalidade: modal, valor: entrada.valorArrecadado });
  };

  const cancelEdit = () => {
    setEditId(null);
    setSavingEdit(false);
    setOriginalEdit(null);
  };

  const onChangeEditValor = (raw: string) => {
    const onlyDigits = raw.replace(/\D/g, '');
    const cents = onlyDigits === '' ? '0' : onlyDigits;
    const num = Number(cents) / 100;
    setEditValorStr(formatNumberToBR(num));
  };

  const saveEdit = async (id: number) => {
    try {
      setSavingEdit(true);

      // valida
      if (isNaN(editValorNum) || editValorNum < 0) {
        alert('Informe um valor válido.');
        setSavingEdit(false);
        return;
      }

      // evita request se nada mudou
      const nothingChanged =
        originalEdit &&
        originalEdit.modalidade === editModalidade &&
        Math.abs(originalEdit.valor - editValorNum) < 0.000001;

      if (nothingChanged) {
        cancelEdit();
        return;
      }

      const payload = {
        modalidade: editModalidade,
        valorArrecadado: editValorNum
      };

      await axios.put(`${API}/entradas/${id}`, payload);
      await carregarEntradas();
      setEditId(null);
      setOriginalEdit(null);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.error || 'Erro ao salvar edição da entrada.';
      alert(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const filtrarEntradas = () => {
    const filtrado = entradas.filter((e) => {
      const mes = toYearMonth(e.data);
      return (
        (!filtroSede || e.sede.nome === filtroSede) &&
        (!filtroGerente || e.gerente.toLowerCase().includes(filtroGerente.toLowerCase())) &&
        (!filtroMes || mes === filtroMes)
      );
    });

    return filtrado.sort(
      (a, b) => dayjs.utc(b.data).valueOf() - dayjs.utc(a.data).valueOf()
    );
  };

  const totalFiltrado = filtrarEntradas().reduce((sum, e) => sum + e.valorArrecadado, 0);

  const valorJackpotPreview = Math.max(valorArrecadadoNum - retirada, 0);

  // estados auxiliares para botão salvar na edição
  const editDisabled = savingEdit || isNaN(editValorNum) || editValorNum < 0;

  return (
    <AdminLayout>
      <div className="max-w-xl mx-auto mb-10">
        <h1 className="text-2xl font-bold text-gold mb-4">Cadastrar Arrecadação</h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-pokerGreen p-6 rounded-xl shadow-lg">
          <div>
            <label className="block text-sm mb-1">Sede</label>
            <select
              className="w-full p-2 rounded text-black"
              value={sedeId}
              onChange={(e) => setSedeId(Number(e.target.value))}
            >
              {sedeInfo.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Modalidade</label>
            <select
              className="w-full p-2 rounded text-black"
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value as 'Texas' | 'Omaha')}
            >
              <option value="Texas">Texas</option>
              <option value="Omaha">Omaha</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Valor Arrecadado (R$)</label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full p-2 rounded text-black"
              value={valorArrecadadoStr}
              onChange={(e) => onChangeValorArrecadado(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Gerente</label>
            <input
              type="text"
              className="w-full p-2 rounded text-black"
              value={gerente}
              onChange={(e) => setGerente(e.target.value)}
            />
          </div>

          <div className="text-sm text-gold space-y-1">
            <div>Retirada automática: <span className="text-white">{formatCurrencyBR(retirada)}</span></div>
            <div>Valor adicionado ao jackpot: <span className="text-white">{formatCurrencyBR(valorJackpotPreview)}</span></div>
          </div>

          <button
            type="submit"
            disabled={savingCreate || valorArrecadadoNum <= 0 || !gerente}
            className="w-full bg-gold text-black font-bold py-2 rounded hover:opacity-90 transition disabled:opacity-60"
          >
            {savingCreate ? 'Salvando...' : 'Salvar entrada'}
          </button>
        </form>
      </div>

      <div className="bg-pokerGreen rounded-xl shadow-lg p-4">
        <h2 className="text-lg font-bold mb-4 text-gold">Histórico de Entradas</h2>

        <div className="flex flex-wrap gap-4 mb-4">
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

          <input
            type="text"
            className="p-2 rounded text-black"
            placeholder="Filtrar por gerente"
            value={filtroGerente}
            onChange={(e) => setFiltroGerente(e.target.value)}
          />
        </div>

        <div className="text-gold font-semibold text-sm mb-4">
          Total arrecadado no mês selecionado:
          <span className="ml-2 text-white">{formatCurrencyBR(totalFiltrado)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-white">
            <thead>
              <tr className="border-b border-gold/30">
                <th className="p-2">Data</th>
                <th className="p-2">Sede</th>
                <th className="p-2">Modalidade</th>
                <th className="p-2">Arrecadado</th>
                <th className="p-2">Retirada</th>
                <th className="p-2">Jackpot</th>
                <th className="p-2">Gerente</th>
                <th className="p-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrarEntradas().map((entrada) => {
                const isEditing = editId === entrada.id;

                return (
                  <tr key={entrada.id} className="border-b border-white/10">
                    <td className="p-2">{fmtDateBR(entrada.data)}</td>
                    <td className="p-2">{entrada.sede.nome}</td>

                    <td className="p-2">
                      {isEditing ? (
                        <select
                          className="p-1 rounded text-black"
                          value={editModalidade}
                          onChange={(e) =>
                            setEditModalidade((e.target.value as 'Texas' | 'Omaha') ?? 'Texas')
                          }
                        >
                          <option value="Texas">Texas</option>
                          <option value="Omaha">Omaha</option>
                        </select>
                      ) : (
                        entrada.modalidade
                      )}
                    </td>

                    <td className="p-2">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-28 p-1 rounded text-black"
                          value={editValorStr}
                          onChange={(e) => onChangeEditValor(e.target.value)}
                          placeholder="0,00"
                        />
                      ) : (
                        <>{formatCurrencyBR(entrada.valorArrecadado)}</>
                      )}
                    </td>

                    <td className="p-2">{formatCurrencyBR(entrada.retiradaEventos)}</td>
                    <td className="p-2">{formatCurrencyBR(entrada.valorJackpot)}</td>
                    <td className="p-2">{entrada.gerente}</td>

                    <td className="p-2">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => saveEdit(entrada.id)}
                            disabled={editDisabled}
                            className="bg-gold text-black px-3 py-1 rounded font-semibold disabled:opacity-60"
                          >
                            {savingEdit ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-transparent border border-white/40 px-3 py-1 rounded"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button
                            onClick={() => startEdit(entrada)}
                            className="bg-transparent border border-gold text-gold px-3 py-1 rounded hover:bg-gold hover:text-black transition"
                          >
                            Editar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
