import React, { useState, useEffect } from 'react';
import { EventItem, EventCategory } from '../types';
import { X, Calendar, Clock, MapPin, Pencil, Save, Utensils, QrCode } from 'lucide-react';
import { notificationService } from '../utils/notificationService';

interface EventModalProps {
  isOpen: boolean;
  eventToEdit?: EventItem | null;
  onClose: () => void;
  onSave: (savedEvent: EventItem) => void;
  onOpenQrCode?: (event: EventItem) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  eventToEdit,
  onClose,
  onSave,
  onOpenQrCode,
}) => {
  const now = new Date();
  const defaultEventDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const defaultOpensAt = now.toISOString().slice(0, 16);
  const defaultClosesAt = new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState(defaultEventDate);
  const [registrationOpensAt, setRegistrationOpensAt] = useState(defaultOpensAt);
  const [registrationClosesAt, setRegistrationClosesAt] = useState(defaultClosesAt);
  const [totalCapacity, setTotalCapacity] = useState<number>(200);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description || '');
      setLocation(eventToEdit.location || '');
      setEventDate(
        eventToEdit.eventDate ? eventToEdit.eventDate.slice(0, 16) : defaultEventDate
      );
      setRegistrationOpensAt(
        eventToEdit.registrationOpensAt
          ? eventToEdit.registrationOpensAt.slice(0, 16)
          : defaultOpensAt
      );
      setRegistrationClosesAt(
        eventToEdit.registrationClosesAt
          ? eventToEdit.registrationClosesAt.slice(0, 16)
          : defaultClosesAt
      );
      setTotalCapacity(eventToEdit.totalCapacity || 200);
    } else {
      setTitle('');
      setDescription('');
      setLocation('');
      setEventDate(defaultEventDate);
      setRegistrationOpensAt(defaultOpensAt);
      setRegistrationClosesAt(defaultClosesAt);
      setTotalCapacity(200);
    }
  }, [eventToEdit, isOpen]);

  // Tecla ESC para fechar modal de evento
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const capacityNum = Number(totalCapacity) || 100;

    if (eventToEdit) {
      // EDIT MODE
      const updatedCategories = (eventToEdit.categories || []).map(c => ({
        ...c,
        maxCapacity: capacityNum,
      }));

      if (updatedCategories.length === 0) {
        updatedCategories.push({
          id: `cat-geral-${Date.now()}`,
          name: 'Credenciamento Geral',
          maxCapacity: capacityNum,
          registeredCount: 0,
          checkedInCount: 0,
          color: '#06b6d4',
          price: 'Gratuito',
          description: 'Credencial oficial com validação biométrica facial.',
        });
      }

      const updatedEvent: EventItem = {
        ...eventToEdit,
        title: title.trim(),
        description: description.trim() || 'Centro de Eventos Principal',
        location: location.trim() || 'Menu Especial do Dia',
        eventDate,
        registrationOpensAt,
        registrationClosesAt,
        categories: updatedCategories,
        totalCapacity: capacityNum,
        status: new Date(registrationOpensAt).getTime() > Date.now() ? 'upcoming' : 'open',
      };

      onSave(updatedEvent);

      notificationService.notify({
        title: '✏️ Evento Atualizado com Sucesso',
        message: `"${updatedEvent.title}" foi atualizado no sistema.`,
        type: 'system',
        eventId: updatedEvent.id,
      });

      onClose();
      return;
    }

    // CREATE MODE
    const defaultCategories: EventCategory[] = [
      {
        id: `cat-geral-${Date.now()}`,
        name: 'Credenciamento Geral',
        maxCapacity: capacityNum,
        registeredCount: 0,
        checkedInCount: 0,
        color: '#06b6d4',
        price: 'Gratuito',
        description: 'Credencial oficial com validação biométrica facial.',
      },
    ];

    const newEvent: EventItem = {
      id: `evt-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Evento corporativo com credenciamento facial.',
      location: location.trim() || 'Centro de Eventos Principal',
      eventDate,
      registrationOpensAt,
      registrationClosesAt,
      categories: defaultCategories,
      totalCapacity: capacityNum,
      status: new Date(registrationOpensAt).getTime() > Date.now() ? 'upcoming' : 'open',
      bannerGradient: 'from-cyan-600 via-blue-600 to-indigo-800',
      createdAt: new Date().toISOString(),
    };

    onSave(newEvent);

    notificationService.notify({
      title: '📅 Novo Evento Configurado',
      message: `"${newEvent.title}" criado com capacidade para ${capacityNum} vagas totais.`,
      type: 'event_open',
      eventId: newEvent.id,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider mb-0.5">
              {eventToEdit ? (
                <>
                  <Pencil className="w-4 h-4" />
                  <span>Tecla de Edição de Evento</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Novo Evento</span>
                </>
              )}
            </div>
            <h2 className="text-base font-bold text-white">
              {eventToEdit ? `Editar Evento: "${eventToEdit.title}"` : 'Criar Novo Evento'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {eventToEdit
                ? 'Atualize o nome, local do evento, prato do dia, cronograma e limite de vagas'
                : 'Defina data de liberação das inscrições e encerramento automatizado das vagas'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            title="Fechar (Tecla ESC)"
          >
            <span className="hidden sm:inline text-[10px] font-mono text-slate-400 px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">ESC</span>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome do Evento *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Congresso Nacional de Inteligência Artificial 2026"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Localização
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Refeitório Principal / Bloco Administrativo..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Prato do Dia *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Ex: Filé ao molho madeira, risoto de cogumelos e salada"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Dates & Schedule Controls */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Cronograma & Liberação Automatizada
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Data de Realização do Evento
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    required
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-400 mb-1">
                  Abertura Inicial de Inscrição
                </label>
                <input
                  type="datetime-local"
                  required
                  value={registrationOpensAt}
                  onChange={e => setRegistrationOpensAt(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Libera o formulário automaticamente
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-rose-400 mb-1">
                  Encerramento das Inscrições
                </label>
                <input
                  type="datetime-local"
                  required
                  value={registrationClosesAt}
                  onChange={e => setRegistrationClosesAt(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Bloqueia novas entradas
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {eventToEdit && onOpenQrCode ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQrCode(eventToEdit);
                }}
                className="px-3.5 py-2 bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 border border-blue-800/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Criar / Ver Código QR deste evento"
              >
                <QrCode className="w-3.5 h-3.5 text-blue-400" />
                <span>Código QR do Evento</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-cyan-950 transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{eventToEdit ? 'Salvar Alterações do Evento' : 'Criar e Ativar Evento'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

