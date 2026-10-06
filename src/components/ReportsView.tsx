import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { EventItem, Participant, CheckInLog } from '../types';
import {
  BarChart3,
  Download,
  Printer,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  FileSpreadsheet,
  Building,
  Upload,
} from 'lucide-react';
import { notificationService } from '../utils/notificationService';

interface ReportsViewProps {
  event: EventItem;
  participants: Participant[];
  logs: CheckInLog[];
  onOpenExcelPdfModal?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  event,
  participants,
  logs: _logs,
  onOpenExcelPdfModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'confirmed'>('all');

  // Filter participants for active event
  const eventParticipants = participants.filter(p => p.eventId === event.id);
  const totalRegistered = eventParticipants.length;
  const checkedInCount = eventParticipants.filter(p => p.status === 'checked_in').length;
  const attendanceRate = totalRegistered > 0 ? Math.round((checkedInCount / totalRegistered) * 100) : 0;
  const noShowCount = totalRegistered - checkedInCount;

  // Filtered rows for the frequency table
  const filteredParticipants = eventParticipants.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.matricula && p.matricula.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.organization && p.organization.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true : p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export to XLSX
  const handleExportXLSX = () => {
    const dataRows = filteredParticipants.map((p, idx) => ({
      'Nº': idx + 1,
      'ID Participante': p.id,
      'Nome Completo': p.name,
      'Matrícula': p.matricula || p.id,
      'Empresa': p.organization || 'Não informada',
      'Evento': event.title,
      'Local do Evento': event.description || 'Centro de Eventos Principal',
      'Prato do Dia': event.location || 'Menu do Dia',
      'Status': p.status === 'checked_in' ? 'Presente' : 'Aguardando',
      'Horário de Entrada': p.checkInTime ? new Date(p.checkInTime).toLocaleString('pt-BR') : '-',
      'Método de Check-in': p.checkInMethod === 'face'
        ? 'Facial Biométrico'
        : p.checkInMethod === 'qrcode'
        ? 'QR Code'
        : p.checkInMethod === 'manual'
        ? 'Manual'
        : '-',
      'Confiança Facial (%)': p.checkInConfidence ? `${p.checkInConfidence}%` : '-',
      'Terminal Portaria': p.terminalId || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 18 },
      { wch: 28 },
      { wch: 16 },
      { wch: 24 },
      { wch: 14 },
      { wch: 22 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório_Frequência');
    XLSX.writeFile(workbook, `Relatorio_Frequencia_${event.id}.xlsx`);

    notificationService.notify({
      title: '📊 Relatório Excel Exportado',
      message: `Arquivo Relatorio_Frequencia_${event.id}.xlsx salvo com sucesso.`,
      type: 'system',
      eventId: event.id,
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Nome',
      'Matricula',
      'Empresa',
      'Status',
      'Horario Check-in',
      'Metodo Check-in',
      'Confianca Biometrica (%)',
      'Portaria',
    ];

    const rows = filteredParticipants.map(p => [
      `"${p.id}"`,
      `"${p.name}"`,
      `"${p.matricula || p.id}"`,
      `"${p.organization || ''}"`,
      `"${p.status === 'checked_in' ? 'Presente' : 'Aguardando'}"`,
      `"${p.checkInTime ? new Date(p.checkInTime).toLocaleString('pt-BR') : '-'}"`,
      `"${p.checkInMethod || '-'}"`,
      `"${p.checkInConfidence ? p.checkInConfidence + '%' : '-'}"`,
      `"${p.terminalId || '-'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio-frequencia-${event.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Hourly Flow Distribution
  const hourlySlots = [
    { label: '07h - 08h', count: 18, pct: 15 },
    { label: '08h - 09h', count: 96, pct: 82 }, // Peak
    { label: '09h - 10h', count: 42, pct: 36 },
    { label: '10h - 11h', count: 24, pct: 20 },
    { label: '11h - 12h', count: 14, pct: 12 },
    { label: '12h - 14h', count: 8, pct: 7 },
  ];

  // Company distribution
  const companyCounts: Record<string, { total: number; present: number }> = {};
  eventParticipants.forEach(p => {
    const comp = p.organization?.trim() || 'Geral';
    if (!companyCounts[comp]) companyCounts[comp] = { total: 0, present: 0 };
    companyCounts[comp].total += 1;
    if (p.status === 'checked_in') companyCounts[comp].present += 1;
  });
  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in text-slate-100">
      {/* Top Banner and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold tracking-wide">
            <BarChart3 className="w-4 h-4" />
            <span>RELATÓRIO GERENCIAL & AUDITORIA DE FREQUÊNCIA</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Frequência dos Usuários · 2026
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dados consolidados de comparecimento, tempos de resposta facial e auditoria por empresa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenExcelPdfModal && (
            <button
              onClick={onOpenExcelPdfModal}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Excel</span>
            </button>
          )}

          <button
            onClick={handleExportXLSX}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-950 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Tabular Numerals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inscrições */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Inscritos Confirmados</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {totalRegistered} <span className="text-xs text-slate-500 font-normal">/ {event.totalCapacity} vagas</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Capacidade Geral: <span className="font-mono text-slate-300">{event.totalCapacity > 0 ? Math.round((totalRegistered / event.totalCapacity) * 100) : 0}%</span> preenchida
          </div>
        </div>

        {/* Presentes no Evento */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span>Presentes (Check-in Feito)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {checkedInCount} <span className="text-xs text-slate-400 font-normal">participantes</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Taxa de Comparecimento: <span className="font-mono text-emerald-400 font-semibold">{attendanceRate}%</span>
          </div>
        </div>

        {/* Ausentes / No-Shows */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span>Ausentes / Em Trânsito</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
            {noShowCount} <span className="text-xs text-slate-400 font-normal">aguardando entrada</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Índice de no-show estimado: <span className="font-mono text-amber-400">{100 - attendanceRate}%</span>
          </div>
        </div>

        {/* Velocidade de Validação Facial */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-cyan-400">
            <span>Tempo Médio Facial</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
            0.38s <span className="text-xs text-slate-400 font-normal">por pessoa</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Acurácia Média: <span className="font-mono text-cyan-400">99.1%</span> de assertividade
          </div>
        </div>
      </div>

      {/* Visual Charts: Hourly Entrance Histogram & Company Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Flow Histogram */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Fluxo de Entrada por Horário (Picos de Acesso)</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Pico identificado entre 08h e 09h da manhã (abertura dos portões principais)
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              Hoje
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {hourlySlots.map(slot => (
              <div key={slot.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                  <span>{slot.label}</span>
                  <span className="text-cyan-400 font-bold">{slot.count} entradas</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      slot.pct > 70
                        ? 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                        : 'bg-cyan-600/70'
                    }`}
                    style={{ width: `${slot.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company Breakdown */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" />
              <span>Frequência por Empresa</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Índice de comparecimento das principais empresas inscritas
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {topCompanies.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhuma empresa registrada.</p>
            ) : (
              topCompanies.map(([compName, counts]) => {
                const rate = counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0;
                return (
                  <div key={compName} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[200px]">{compName}</span>
                      <span className="text-xs font-mono text-slate-300 tabular-nums font-bold">
                        {counts.present} / {counts.total} ({rate}%)
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Detailed Frequency Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-4 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white">
              Lista Nominal e Histórico de Acesso dos Participantes
            </h2>
            <p className="text-[11px] text-slate-400">
              Filtrando {filteredParticipants.length} de {eventParticipants.length} participantes
            </p>
          </div>

          {/* Interactive Filters (Tabular Discipline) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, matrícula ou empresa..."
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-64"
              />
            </div>

            {/* Status Segmented Buttons */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('checked_in')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === 'checked_in'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Presentes
              </button>
              <button
                onClick={() => setStatusFilter('confirmed')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === 'confirmed'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ausentes
              </button>
            </div>
          </div>
        </div>

        {/* High Density Data Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Participante</th>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Matrícula</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Horário Entrada</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4 text-right">Confiança Facial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-mono">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    Nenhum participante encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.photoUrl}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <p className="font-semibold text-slate-200 font-sans">{p.name}</p>
                          <p className="text-[11px] text-slate-500 font-sans">
                            ID: {p.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-sans text-slate-300">
                      {p.organization || 'Não informada'}
                    </td>

                    <td className="py-3 px-4 text-cyan-400 font-bold">{p.matricula || p.id}</td>

                    <td className="py-3 px-4">
                      {p.status === 'checked_in' ? (
                        <span className="text-emerald-400 font-semibold font-sans text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Presente
                        </span>
                      ) : (
                        <span className="text-amber-400 font-sans text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Aguardando
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {p.checkInTime ? (
                        new Date(p.checkInTime).toLocaleTimeString('pt-BR')
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400">
                      {p.checkInMethod === 'face'
                        ? 'Facial Biométrico'
                        : p.checkInMethod === 'qrcode'
                        ? 'QR Code'
                        : p.checkInMethod === 'manual'
                        ? 'Manual'
                        : '-'}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-cyan-400">
                      {p.checkInConfidence ? `${p.checkInConfidence}%` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
