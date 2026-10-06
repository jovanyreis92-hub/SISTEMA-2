import React, { useState } from 'react';
import { EventItem, EventCategory } from '../types';
import { X, Calendar, Clock, MapPin, Users, ShieldAlert } from 'lucide-react';
import { notificationService } from '../utils/notificationService';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newEvent: EventItem) => void;
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave }) => {
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const capacityNum = Number(totalCapacity) || 100;

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

    // Notify creation
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
            <h2 className="text-base font-bold text-white">Criar Novo Evento</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Defina data de liberação das inscrições e encerramento automatizado das vagas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
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

          {/* Total Capacity & Automated Vacancy Closure */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Capacidade de Vagas & Encerramento Automatizado
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Limite Total de Vagas Disponíveis *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="50000"
                  required
                  value={totalCapacity}
                  onChange={e => setTotalCapacity(Number(e.target.value))}
                  placeholder="Ex: 200"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                O sistema encerrará as inscrições automaticamente assim que o total de inscritos atingir essa capacidade.
              </span>
            </div>
          </div>

          {/* Automated rules notice */}
          <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg flex items-start gap-2 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold">Regras Automáticas do Sistema:</span>
              <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                As vagas fecham no exato instante em que atingirem a capacidade configurada ou quando atingir a data limite. O sistema dispara uma notificação push a cada encerramento.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-cyan-950 transition-all"
            >
              Criar e Ativar Evento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

