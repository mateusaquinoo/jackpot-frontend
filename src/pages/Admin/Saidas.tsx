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
function formatCurrencyBR(n: number): string {
  return currencyBR.format(n).replace(/\u00A0/g, ' ');
}

// API base (ajuste a porta se necessário)
const API = 'http://localhost:3001';

interface Sede {
  id: number;
  nome: string;
}

interface Saida {
  id: number;
  data: string;       // ISO (UTC)
  modalidade: 'Texas' | 'Omaha' | string;
  mesa: string;
  mao: string;
  premio: number;
  gerente: string;
  sede: {
    nome: string;
  };
}

export default function Saidas() {
  const [sedeId, setSedeId] = useState<number>(1);
  const [modalidade, setModalidade] = useState<'Texas' | 'Omaha'>('Texas');
  const [mesa, setMesa] = useState('1-2');
  const [mao, setMao] = useState('Royal Straight Flush');
  const [gerente, setGerente] = useState('');

  const [sedeInfo, setSedeInfo] = useState<Sede[]>([]);
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([]);

  // filtros
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroGerente, setFiltroGerente] = useState('');

  // feedback do cálculo do prêmio retornado pela API
  const [premioCalculado, setPremioCalculado] = useState<number | null>(null);

  // loading ao salvar criação
  const [savingCreate, setSavingCreate] = useState<boolean>(false);

  // edição inline
  const [editId, setEditId] = useState<number | null>(null);
  const [editModalidade, setEditModalidade] = useState<'Texas' | 'Omaha'>('Texas');
  const [editMesa, setEditMesa] = useState<string>('1-2');
  const [editMao, setEditMao] = useState<string>('Royal Straight Flush');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [originalEdit, setOriginalEdit] = useState<{ modalidade: 'Texas' | 'Omaha'; mesa: string; mao: string } | null>(null);

  useEffect(() => {
    setSedeInfo([
      { id: 1, nome: 'Alphaville' },
      { id: 2, nome: 'Jd. América' }
    ]);
    carregarSaidas();
  }, []);

  const carregarSaidas = async () => {
    const res = await axios.get(`${API}/saidas`);
    const todas: Saida[] = res.data;

    const meses = Array.from(new Set(todas.map((s) => toYearMonth(s.data)))).sort((a, b) =>
      a.localeCompare(b)
    );

    setSaidas(todas);
    setMesesDisponiveis(meses);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSavingCreate(true);

      // Data UTC ISO + hora local (São Paulo) no formato HH:mm
      const dataISO = dayjs().utc().toISOString();
      const horaLocal = dayjs().tz().format('HH:mm');

      const res = await axios.post(`${API}/saidas`, {
        data: dataISO,
        hora: horaLocal,
        modalidade,
        mesa,
        jogador: 'PREMIADO',
        mao,
        sedeId,
        gerente,
        feito: true
      });

      setPremioCalculado(res.data?.premio ?? null);
      setGerente('');
      await carregarSaidas();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.error || 'Erro ao registrar saída.';
      alert(msg);
    } finally {
      setSavingCreate(false);
    }
  };

  // edição
  const startEdit = (s: Saida) => {
    const modal = s.modalidade === 'Omaha' ? 'Omaha' : 'Texas';
    setEditId(s.id);
    setEditModalidade(modal);
    setEditMesa(s.mesa);
    setEditMao(s.mao);
    setOriginalEdit({ modalidade: modal, mesa: s.mesa, mao: s.mao });
  };

  const cancelEdit = () => {
    setEditId(null);
    setSavingEdit(false);
    setOriginalEdit(null);
  };

  const saveEdit = async (id: number) => {
    try {
      setSavingEdit(true);

      const nothingChanged =
        originalEdit &&
        originalEdit.modalidade === editModalidade &&
        originalEdit.mesa === editMesa &&
        originalEdit.mao === editMao;

      if (nothingChanged) {
        cancelEdit();
        return;
      }

      await axios.put(`${API}/saidas/${id}`, {
        modalidade: editModalidade,
        mesa: editMesa,
        mao: editMao
      });

      await carregarSaidas();
      setEditId(null);
      setOriginalEdit(null);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.error || 'Erro ao salvar edição da saída.';
      alert(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const filtrarSaidas = () => {
    const filtrado = saidas.filter((s) => {
      const mes = toYearMonth(s.data);
      return (
        (!filtroSede || s.sede.nome === filtroSede) &&
        (!filtroGerente || s.gerente.toLowerCase().includes(filtroGerente.toLowerCase())) &&
        (!filtroMes || mes === filtroMes)
      );
    });

    return filtrado.sort(
      (a, b) => dayjs.utc(b.data).valueOf() - dayjs.utc(a.data).valueOf()
    );
  };

  const totalPremios = filtrarSaidas().reduce((sum, s) => sum + s.premio, 0);

  // helpers de UI
  const mesasOptions = ['1-2', '5-5', '5-10', '10-25+'];
  const maosOptions = [
    'Quadra',
    'Straight Flush',
    'Royal Straight Flush',
    'Royal x Straight',
    'Straight x Straight'
  ];

  return (
    <AdminLayout>
      <div className="max-w-xl mx-auto mb-10">
        <h1 className="text-2xl font-bold text-gold mb-4">Registrar Prêmio</h1>

        <form onSubmit={handleSubmit} className="space-y-4 bg-pokerGreen p-6 rounded-xl shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Sede</label>
              <select
                className="w-full p-2 rounded text-black"
                value={sedeId}
                onChange={(e) => setSedeId(Number(e.target.value))}
              >
                {sedeInfo.map((sede) => (
                  <option key={sede.id} value={sede.id}>{sede.nome}</option>
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
                <option>Texas</option>
                <option>Omaha</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Mesa (Blind)</label>
              <select
                className="w-full p-2 rounded text-black"
                value={mesa}
                onChange={(e) => setMesa(e.target.value)}
              >
                {mesasOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Mão Vencedora</label>
              <select
                className="w-full p-2 rounded text-black"
                value={mao}
                onChange={(e) => setMao(e.target.value)}
              >
                {maosOptions.map((mv) => (
                  <option key={mv} value={mv}>{mv}</option>
                ))}
              </select>
            </div>
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

          <button
            type="submit"
            disabled={savingCreate || !gerente}
            className="w-full bg-gold text-black font-bold py-2 rounded hover:opacity-90 transition disabled:opacity-60"
          >
            {savingCreate ? 'Registrando...' : 'Registrar prêmio'}
          </button>

          {premioCalculado !== null && (
            <div className="text-sm text-gold mt-3">
              Prêmio calculado: <span className="text-white">{formatCurrencyBR(premioCalculado)}</span>
            </div>
          )}
        </form>
      </div>

      <div className="bg-pokerGreen rounded-xl shadow-lg p-4">
        <h2 className="text-lg font-bold mb-4 text-gold">Histórico de Prêmios</h2>

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
          Total pago no mês selecionado:
          <span className="ml-2 text-white">{formatCurrencyBR(totalPremios)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-white">
            <thead>
              <tr className="border-b border-gold/30">
                <th className="p-2">Data</th>
                <th className="p-2">Sede</th>
                <th className="p-2">Modalidade</th>
                <th className="p-2">Mesa</th>
                <th className="p-2">Mão</th>
                <th className="p-2">Prêmio</th>
                <th className="p-2">Gerente</th>
                <th className="p-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrarSaidas().map((s) => {
                const isEditing = editId === s.id;

                return (
                  <tr key={s.id} className="border-b border-white/10">
                    <td className="p-2">{fmtDateBR(s.data)}</td>
                    <td className="p-2">{s.sede.nome}</td>

                    <td className="p-2">
                      {isEditing ? (
                        <select
                          className="p-1 rounded text-black"
                          value={editModalidade}
                          onChange={(e) => setEditModalidade((e.target.value as 'Texas' | 'Omaha') ?? 'Texas')}
                        >
                          <option value="Texas">Texas</option>
                          <option value="Omaha">Omaha</option>
                        </select>
                      ) : (
                        s.modalidade
                      )}
                    </td>

                    <td className="p-2">
                      {isEditing ? (
                        <select
                          className="p-1 rounded text-black"
                          value={editMesa}
                          onChange={(e) => setEditMesa(e.target.value)}
                        >
                          {mesasOptions.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      ) : (
                        s.mesa
                      )}
                    </td>

                    <td className="p-2">
                      {isEditing ? (
                        <select
                          className="p-1 rounded text-black"
                          value={editMao}
                          onChange={(e) => setEditMao(e.target.value)}
                        >
                          {maosOptions.map((mv) => (
                            <option key={mv} value={mv}>{mv}</option>
                          ))}
                        </select>
                      ) : (
                        s.mao
                      )}
                    </td>

                    <td className="p-2">{formatCurrencyBR(s.premio)}</td>
                    <td className="p-2">{s.gerente}</td>

                    <td className="p-2">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => saveEdit(s.id)}
                            disabled={savingEdit}
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
                            onClick={() => startEdit(s)}
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
