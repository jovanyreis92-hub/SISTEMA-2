import React, { useState, useEffect } from 'react';
import { EventItem, Participant } from '../types';
import {
  X,
  Calendar,
  MapPin,
  Utensils,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FolderX,
  Pencil,
  QrCode,
} from 'lucide-react';

interface ManageEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  activeEventId: string;
  participants: Participant[];
  onSelectEvent: (id: string) => void;
  onEditEvent?: (event: EventItem) => void;
  onOpenEventQrModal?: (event: EventItem) => void;
  onDeleteEvent: (id: string) => void;
  onClearPreviousEvents?: () => void;
  onOpenNewEventModal: () => void;
}

export const ManageEventsModal: React.FC<ManageEventsModalProps> = ({
  isOpen,
  onClose,
  events,
  activeEventId,
  participants,
  onSelectEvent,
  onEditEvent,
  onOpenEventQrModal,
  onDeleteEvent,
  onClearPreviousEvents,
  onOpenNewEventModal,
}) => {
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  // Tecla ESC para fechar confirmações ou o modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isClearAllConfirmOpen) {
          setIsClearAllConfirmOpen(false);
        } else if (eventToDelete) {
          setEventToDelete(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClearAllConfirmOpen, eventToDelete, onClose]);

  if (!isOpen) return null;

  const handleConfirmDelete = () => {
    if (eventToDelete) {
      onDeleteEvent(eventToDelete.id);
      setEventToDelete(null);
    }
  };

  const handleConfirmClearAll = () => {
    if (onClearPreviousEvents) {
      onClearPreviousEvents();
      setIsClearAllConfirmOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Gestão & Exclusão de Eventos</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Eventos Registrados no Sistema ({events.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Exclua eventos anteriores criados com o sistema ou alterne entre eventos ativos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors flex items-center gap-1.5"
            title="Fechar (Tecla ESC)"
          >
            <span className="hidden sm:inline text-[10px] font-mono text-slate-400 px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">ESC</span>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Toolbar */}
        <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewEventModal();
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Evento</span>
            </button>

            {onClearPreviousEvents && events.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearAllConfirmOpen(true)}
                className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                title="Remover eventos antigos/previamente criados no sistema"
              >
                <FolderX className="w-3.5 h-3.5 text-rose-400" />
                <span>Remover Eventos Anteriores</span>
              </button>
            )}
          </div>

          <span className="text-[11px] text-slate-400">
            Total de eventos: <strong className="text-cyan-400 font-mono">{events.length}</strong>
          </span>
        </div>

        {/* List of events */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-slate-300">Nenhum evento registrado no sistema.</p>
              <p className="text-xs text-slate-500">Clique em &quot;Novo Evento&quot; para cadastrar o primeiro.</p>
            </div>
          ) : (
            events.map((evt) => {
              const isActive = evt.id === activeEventId;
              const evtParticipantsCount = participants.filter((p) => p.eventId === evt.id).length;

              return (
                <div
                  key={evt.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-slate-950/80 border-cyan-500/50 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-white truncate">{evt.title}</h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                            Ativo
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          {evtParticipantsCount} participante(s)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-400 pt-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">
                            {new Date(evt.eventDate).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(evt.eventDate).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate" title={evt.description}>
                            <strong>Local:</strong> {evt.description || 'Não especificado'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 truncate text-amber-300/90">
                          <Utensils className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate" title={evt.location}>
                            <strong>Prato:</strong> {evt.location || 'Não informado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                      {onOpenEventQrModal && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenEventQrModal(evt);
                          }}
                          className="px-3 py-1.5 bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 border border-blue-800/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title={`Criar / Ver Código QR do Evento "${evt.title}"`}
                        >
                          <QrCode className="w-3.5 h-3.5 text-blue-400" />
                          <span>QR Code</span>
                        </button>
                      )}

                      {onEditEvent && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onEditEvent(evt);
                          }}
                          className="px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title={`Editar dados do evento "${evt.title}" (Tecla de Edição)`}
                        >
                          <Pencil className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Editar</span>
                        </button>
                      )}

                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => onSelectEvent(evt.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Tornar Ativo
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setEventToDelete(evt)}
                        className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title={`Excluir "${evt.title}" do sistema`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Single Event Delete */}
      {eventToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-rose-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-950 border border-rose-600 flex items-center justify-center text-rose-400">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Excluir Evento: &quot;{eventToDelete.title}&quot;?
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Tem certeza de que deseja excluir este evento do sistema? Todos os participantes,
                fotos biométricas e registros vinculados a ele serão permanentemente excluídos.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-950"
              >
                Sim, Excluir Evento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing Previous Events */}
      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-amber-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-950 border border-amber-600 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Remover Eventos Anteriores do Sistema?
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Esta ação excluirá todos os eventos antigos/anteriores que vieram pré-carregados no
                sistema, permitindo iniciar com um ambiente totalmente limpo para seus novos eventos.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md shadow-amber-950"
              >
                Confirmar Limpeza
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
