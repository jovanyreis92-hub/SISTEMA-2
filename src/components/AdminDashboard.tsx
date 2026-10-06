import React, { useState, useEffect } from 'react';
import { EventItem, Participant, CheckInLog } from '../types';
import { BadgeModal } from './BadgeModal';
import { EditParticipantModal } from './EditParticipantModal';
import { ManageEventsModal } from './ManageEventsModal';
import { EventQrModal } from './EventQrModal';
import { recordCheckIn } from '../utils/storage';
import {
  Users,
  CheckCircle2,
  Clock,
  QrCode,
  ShieldCheck,
  Search,
  Plus,
  Calendar,
  MapPin,
  Utensils,
  FileSpreadsheet,
  Palette,
  Trash2,
  CheckSquare,
  Pencil,
} from 'lucide-react';

interface AdminDashboardProps {
  event: EventItem;
  events: EventItem[];
  participants: Participant[];
  logs: CheckInLog[];
  onOpenKiosk?: () => void;
  onOpenRegistration?: () => void;
  onOpenReports?: () => void;
  onOpenNewEventModal: () => void;
  onOpenEditEventModal?: (event: EventItem) => void;
  onOpenLayoutModal: () => void;
  onOpenExcelPdfModal: () => void;
  onSelectEvent?: (id: string) => void;
  onDeleteEvent?: (id: string) => void;
  onClearPreviousEvents?: () => void;
  onUpdateParticipant: (participant: Participant, updatedEvent: EventItem) => void;
  onEditParticipantDetails?: (updatedParticipant: Participant) => void;
  onDeleteParticipant: (id: string) => void;
  onDeleteMultipleParticipants?: (ids: string[]) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  event,
  events,
  participants,
  logs: _logs,
  onOpenNewEventModal,
  onOpenEditEventModal,
  onOpenLayoutModal,
  onOpenExcelPdfModal,
  onSelectEvent,
  onDeleteEvent,
  onClearPreviousEvents,
  onUpdateParticipant,
  onEditParticipantDetails,
  onDeleteParticipant,
  onDeleteMultipleParticipants,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'checked_in' | 'confirmed'>('all');
  const [activeBadgeParticipant, setActiveBadgeParticipant] = useState<Participant | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isManageEventsModalOpen, setIsManageEventsModalOpen] = useState(false);
  const [isEventQrModalOpen, setIsEventQrModalOpen] = useState(false);
  const [qrModalEvent, setQrModalEvent] = useState<EventItem | null>(null);

  // Keyboard shortcut listener:
  // Tecla ESC: Fecha qualquer aba ou modal aberto no painel de controle
  // Key 'e' or 'E': Tecla de Edição de Evento
  // Key 'q' or 'Q': Código QR do Evento
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tecla ESC: Prioridade máxima para fechar abas/modais abertos
      if (e.key === 'Escape') {
        if (isDeleteConfirmOpen) {
          e.preventDefault();
          setIsDeleteConfirmOpen(false);
          return;
        }
        if (isEventQrModalOpen) {
          e.preventDefault();
          setIsEventQrModalOpen(false);
          setQrModalEvent(null);
          return;
        }
        if (isManageEventsModalOpen) {
          e.preventDefault();
          setIsManageEventsModalOpen(false);
          return;
        }
        if (editingParticipant) {
          e.preventDefault();
          setEditingParticipant(null);
          return;
        }
        if (activeBadgeParticipant) {
          e.preventDefault();
          setActiveBadgeParticipant(null);
          return;
        }
        if (selectedParticipantIds.length > 0) {
          e.preventDefault();
          setSelectedParticipantIds([]);
          return;
        }
        if (searchTerm) {
          e.preventDefault();
          setSearchTerm('');
          return;
        }
      }

      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.key === 'e' || e.key === 'E') && onOpenEditEventModal) {
        e.preventDefault();
        onOpenEditEventModal(event);
      }

      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setQrModalEvent(event);
        setIsEventQrModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    event,
    onOpenEditEventModal,
    isDeleteConfirmOpen,
    isEventQrModalOpen,
    isManageEventsModalOpen,
    editingParticipant,
    activeBadgeParticipant,
    selectedParticipantIds,
    searchTerm,
  ]);

  // Filter participants for active event
  const eventParticipants = participants.filter(p => p.eventId === event.id);
  const totalRegistered = eventParticipants.length;
  const checkedInCount = eventParticipants.filter(p => p.status === 'checked_in').length;
  const absentCount = Math.max(0, totalRegistered - checkedInCount);
  const remainingTotalSpots = Math.max(0, event.totalCapacity - totalRegistered);
  const occupancyRate = event.totalCapacity > 0 ? Math.round((totalRegistered / event.totalCapacity) * 100) : 0;
  const attendanceRate = totalRegistered > 0 ? Math.round((checkedInCount / totalRegistered) * 100) : 0;
  const absentRate = totalRegistered > 0 ? Math.round((absentCount / totalRegistered) * 100) : 0;

  // Filter table rows
  const filteredParticipants = eventParticipants.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.matricula && p.matricula.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.organization && p.organization.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStat = selectedStatus === 'all' ? true : p.status === selectedStatus;

    return matchesSearch && matchesStat;
  });

  // Manual Check-in toggle
  const handleToggleManualCheckIn = (participant: Participant) => {
    if (participant.status === 'checked_in') {
      // Revert checkin
      const updatedP: Participant = {
        ...participant,
        status: 'confirmed',
        checkInTime: undefined,
        checkInMethod: undefined,
        checkInConfidence: undefined,
      };

      const updatedCats = event.categories.map(c => {
        if (c.id === participant.categoryId) {
          return { ...c, checkedInCount: Math.max(0, c.checkedInCount - 1) };
        }
        return c;
      });

      onUpdateParticipant(updatedP, { ...event, categories: updatedCats });
    } else {
      // Perform manual checkin
      const { updatedParticipant, updatedEvent } = recordCheckIn(
        participant,
        event,
        'manual',
        100,
        'TERMINAL-ADMIN-PAINEL'
      );
      onUpdateParticipant(updatedParticipant, updatedEvent);
    }
  };

  // Multi-selection helpers
  const isAllSelected =
    filteredParticipants.length > 0 &&
    filteredParticipants.every(p => selectedParticipantIds.includes(p.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const currentFilteredIds = new Set(filteredParticipants.map(p => p.id));
      setSelectedParticipantIds(prev => prev.filter(id => !currentFilteredIds.has(id)));
    } else {
      const merged = new Set([...selectedParticipantIds, ...filteredParticipants.map(p => p.id)]);
      setSelectedParticipantIds(Array.from(merged));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedParticipantIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBatchDelete = () => {
    if (selectedParticipantIds.length === 0) return;
    if (onDeleteMultipleParticipants) {
      onDeleteMultipleParticipants(selectedParticipantIds);
    } else {
      selectedParticipantIds.forEach(id => onDeleteParticipant(id));
    }
    setSelectedParticipantIds([]);
    setIsDeleteConfirmOpen(false);
  };

  const handleSingleDelete = (p: Participant) => {
    if (
      window.confirm(
        `Deseja realmente excluir a inscrição de "${p.name}" (Matrícula: ${p.matricula || p.id})?`
      )
    ) {
      onDeleteParticipant(p.id);
      setSelectedParticipantIds(prev => prev.filter(id => id !== p.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Event Header with actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Painel de Controle Administrativo</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">{event.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {new Date(event.eventDate).toLocaleDateString('pt-BR')} às{' '}
              {new Date(event.eventDate).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span><strong>Local:</strong> {event.description || 'Centro de Eventos'}</span>
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <Utensils className="w-3.5 h-3.5 text-amber-400" />
              <span><strong>Prato do Dia:</strong> {event.location || 'Menu do Dia'}</span>
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenNewEventModal}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all"
            title="Cadastrar um novo evento com data, horário e prato do dia"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Evento</span>
          </button>

          {/* CRIAR CÓDIGO QR DO EVENTO */}
          <button
            onClick={() => {
              setQrModalEvent(event);
              setIsEventQrModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-950 flex items-center gap-2 transition-all"
            title="Criar / Exibir Código QR do Evento para inscrição, credenciamento e impressão de cartaz"
          >
            <QrCode className="w-4 h-4" />
            <span>Código QR do Evento</span>
          </button>

          {/* EDITAR EVENTO */}
          {onOpenEditEventModal && (
            <button
              onClick={() => onOpenEditEventModal(event)}
              className="px-3.5 py-2.5 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/80 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
              title="Editar dados cadastrados deste evento (Nome, Local, Prato do Dia, Horário)"
            >
              <Pencil className="w-4 h-4 text-cyan-400" />
              <span>Editar Evento</span>
            </button>
          )}

          <button
            onClick={() => setIsManageEventsModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
            title="Excluir eventos anteriores criados com o sistema ou alternar eventos"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Excluir / Gerenciar Eventos ({events.length})</span>
          </button>

          <button
            onClick={onOpenExcelPdfModal}
            className="px-3.5 py-2.5 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
            title="Importar e Exportar Planilhas Excel e Relatórios PDF"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel & PDF</span>
          </button>

          <button
            onClick={onOpenLayoutModal}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Personalizar Logotipo, Cores e Título da Aplicação"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>Layout & Logo</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Tabular Figures) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registrations */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Inscrições Efetuadas</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white tabular-nums">
            {totalRegistered}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Capacidade total:</span>
            <span className="font-mono text-slate-300">{event.totalCapacity} vagas</span>
          </div>
        </div>

        {/* PRESENTES */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold uppercase tracking-wider">
            <span>PRESENTES</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-400 tabular-nums">
            {checkedInCount}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Taxa de Presença:</span>
            <span className="font-mono text-emerald-400 font-bold">{attendanceRate}%</span>
          </div>
        </div>

        {/* AUSENTES */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold uppercase tracking-wider">
            <span>AUSENTES</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-amber-400 tabular-nums">
            {absentCount}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Aguardando Entrada:</span>
            <span className="font-mono text-amber-400 font-bold">{absentRate}%</span>
          </div>
        </div>

        {/* Latência de Entrada Biométrica */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-indigo-400 font-medium">
            <span>Tempo Médio Validação</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-indigo-300 tabular-nums">
            0.38s
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Leituras sem fila:</span>
            <span className="font-mono text-indigo-400 font-semibold">100% automatizado</span>
          </div>
        </div>
      </div>

      {/* Participants Management Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Gerenciamento de Inscritos & Credenciais</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Total de {filteredParticipants.length} inscritos listados no evento
            </p>
          </div>

          {/* Table Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
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

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as 'all' | 'checked_in' | 'confirmed')}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">Todos Status</option>
              <option value="checked_in">Presentes</option>
              <option value="confirmed">Aguardando</option>
            </select>

            <button
              onClick={onOpenExcelPdfModal}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Importar / Exportar</span>
            </button>
          </div>
        </div>

        {/* Batch Action Toolbar when items are selected */}
        {selectedParticipantIds.length > 0 && (
          <div className="p-3 bg-cyan-950/60 border border-cyan-700/80 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-fade-in text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>{selectedParticipantIds.length} participante(s) selecionado(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedParticipantIds([])}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
              >
                Desmarcar Todos
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-md shadow-rose-950 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Selecionados ({selectedParticipantIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                    title="Selecionar todos os participantes exibidos"
                  />
                </th>
                <th className="py-3 px-4">Participante</th>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Matrícula</th>
                <th className="py-3 px-4">Biometria</th>
                <th className="py-3 px-4">Presença</th>
                <th className="py-3 px-4 text-right">Ações</th>
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
                filteredParticipants.map(p => {
                  const isSelected = selectedParticipantIds.includes(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-cyan-950/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(p.id)}
                          className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                        />
                      </td>

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
                        {p.faceEmbeddings && p.faceEmbeddings.length > 0 ? (
                          <span className="text-emerald-400 text-xs flex items-center gap-1 font-sans">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            64-D Ativo
                          </span>
                        ) : (
                          <span className="text-slate-500 font-sans text-xs">Pendente</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {p.status === 'checked_in' ? (
                          <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 font-sans">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Presente ({p.checkInTime ? new Date(p.checkInTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''})
                          </span>
                        ) : (
                          <span className="text-amber-400 text-xs flex items-center gap-1 font-sans">
                            <Clock className="w-3.5 h-3.5" />
                            Aguardando
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-sans">
                          {/* Tecla de Edição de Participantes */}
                          <button
                            type="button"
                            onClick={() => setEditingParticipant(p)}
                            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                            title="Editar Participante (Tecla de Edição)"
                          >
                            <Pencil className="w-4 h-4 text-cyan-400" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveBadgeParticipant(p)}
                            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                            title="Ver Passaporte / QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleManualCheckIn(p)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                              p.status === 'checked_in'
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                : 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300'
                            }`}
                          >
                            {p.status === 'checked_in' ? 'Desfazer' : 'Dar Entrada'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSingleDelete(p)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded transition-colors"
                            title="Excluir este inscrito"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-800/80 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-950 border border-rose-600 flex items-center justify-center text-rose-400">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confirmar Exclusão em Massa</h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Tem certeza de que deseja excluir <strong>{selectedParticipantIds.length}</strong> participantes selecionados?
                Os dados de matrícula, biometria e credenciais serão removidos permanentemente.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-950"
              >
                Sim, Excluir Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge View Modal */}
      {activeBadgeParticipant && (
        <BadgeModal
          participant={activeBadgeParticipant}
          event={event}
          onClose={() => setActiveBadgeParticipant(null)}
        />
      )}

      {/* Edit Participant Modal (Tecla de Edição) */}
      {editingParticipant && (
        <EditParticipantModal
          isOpen={!!editingParticipant}
          participant={editingParticipant}
          existingParticipants={participants}
          onClose={() => setEditingParticipant(null)}
          onSave={(updated) => {
            if (onEditParticipantDetails) {
              onEditParticipantDetails(updated);
            } else {
              onUpdateParticipant(updated, event);
            }
            setEditingParticipant(null);
          }}
        />
      )}

      {/* Manage & Delete Previous Events Modal */}
      <ManageEventsModal
        isOpen={isManageEventsModalOpen}
        onClose={() => setIsManageEventsModalOpen(false)}
        events={events}
        activeEventId={event.id}
        participants={participants}
        onSelectEvent={(id) => {
          if (onSelectEvent) onSelectEvent(id);
          setIsManageEventsModalOpen(false);
        }}
        onEditEvent={(evt) => {
          if (onOpenEditEventModal) onOpenEditEventModal(evt);
        }}
        onOpenEventQrModal={(evt) => {
          setQrModalEvent(evt);
          setIsEventQrModalOpen(true);
        }}
        onDeleteEvent={(id) => {
          if (onDeleteEvent) onDeleteEvent(id);
        }}
        onClearPreviousEvents={onClearPreviousEvents}
        onOpenNewEventModal={onOpenNewEventModal}
      />

      {/* Event QR Code Modal (Criar / Ver Código QR do Evento) */}
      {isEventQrModalOpen && (
        <EventQrModal
          isOpen={isEventQrModalOpen}
          event={qrModalEvent || event}
          onClose={() => {
            setIsEventQrModalOpen(false);
            setQrModalEvent(null);
          }}
          onEditEvent={(evt) => {
            setIsEventQrModalOpen(false);
            if (onOpenEditEventModal) onOpenEditEventModal(evt);
          }}
        />
      )}
    </div>
  );
};
