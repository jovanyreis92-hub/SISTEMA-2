import React, { useState, useEffect } from 'react';
import { Participant } from '../types';
import {
  X,
  User,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  Save,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface EditParticipantModalProps {
  participant: Participant | null;
  isOpen: boolean;
  existingParticipants?: Participant[];
  onClose: () => void;
  onSave: (updatedParticipant: Participant) => void;
}

export const EditParticipantModal: React.FC<EditParticipantModalProps> = ({
  participant,
  isOpen,
  existingParticipants = [],
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(participant?.name?.toUpperCase() || '');
  const [matricula, setMatricula] = useState(participant?.matricula?.replace(/\D/g, '') || '');
  const [organization, setOrganization] = useState(participant?.organization?.toUpperCase() || '');
  const [status, setStatus] = useState<'confirmed' | 'checked_in'>(
    participant?.status === 'checked_in' ? 'checked_in' : 'confirmed'
  );
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (participant) {
      setName(participant.name.toUpperCase());
      setMatricula((participant.matricula || '').replace(/\D/g, ''));
      setOrganization((participant.organization || '').toUpperCase());
      setStatus(participant.status === 'checked_in' ? 'checked_in' : 'confirmed');
      setEditError(null);
    }
  }, [participant]);

  // Tecla ESC para fechar modal de edição
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

  if (!isOpen || !participant) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const upperName = name.trim().toUpperCase();
    const cleanMatricula = matricula.replace(/\D/g, '').trim();
    const upperOrg = organization.trim().toUpperCase();

    if (!upperName) {
      setEditError('O nome do participante é obrigatório.');
      return;
    }

    if (!cleanMatricula) {
      setEditError('A matrícula é obrigatória e deve conter apenas números.');
      return;
    }

    if (!/^\d+$/.test(cleanMatricula)) {
      setEditError('A matrícula deve conter somente números (0-9).');
      return;
    }

    // REGRA 1: IMPEDIR CADASTRO/EDIÇÃO COM MESMO NOME E MESMA MATRÍCULA DE OUTRO PARTICIPANTE
    if (existingParticipants.length > 0) {
      const duplicateName = existingParticipants.find(
        p =>
          p.id !== participant.id &&
          p.eventId === participant.eventId &&
          p.name.trim().toUpperCase() === upperName
      );

      const duplicateMatricula = existingParticipants.find(
        p =>
          p.id !== participant.id &&
          p.eventId === participant.eventId &&
          p.matricula.trim() === cleanMatricula
      );

      if (duplicateName && duplicateMatricula) {
        setEditError(
          `ALTERAÇÃO BLOQUEADA: Já existe outro participante neste evento com o NOME "${upperName}" e com a MATRÍCULA "${cleanMatricula}".`
        );
        return;
      }

      if (duplicateName) {
        setEditError(
          `ALTERAÇÃO BLOQUEADA: Já existe outro participante cadastrado com o NOME "${upperName}".`
        );
        return;
      }

      if (duplicateMatricula) {
        setEditError(
          `ALTERAÇÃO BLOQUEADA: O número de MATRÍCULA "${cleanMatricula}" já pertence a "${duplicateMatricula.name}". Cada matrícula deve ser única.`
        );
        return;
      }
    }

    const updated: Participant = {
      ...participant,
      name: upperName,
      matricula: cleanMatricula,
      organization: upperOrg,
      status,
      // If manually set to checked_in and wasn't before, set checkin timestamp
      checkInTime:
        status === 'checked_in'
          ? participant.checkInTime || new Date().toISOString()
          : undefined,
      checkInMethod:
        status === 'checked_in'
          ? participant.checkInMethod || 'manual'
          : undefined,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Editar Participante</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors flex items-center gap-1.5"
            title="Fechar (Tecla ESC)"
          >
            <span className="hidden sm:inline text-[10px] font-mono text-slate-400 px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">ESC</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Validation Alert */}
          {editError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/80 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-white block">Aviso de Validação:</span>
                <p className="text-[11px] leading-relaxed text-rose-200">{editError}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
            <img
              src={participant.photoUrl}
              alt=""
              className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500/60 shadow-md shadow-cyan-950 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-mono text-cyan-400 font-bold truncate">
                ID: {participant.id}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                Inscrito em {new Date(participant.registeredAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Nome Completo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome Completo *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={e => {
                  setName(e.target.value.toUpperCase());
                  if (editError) setEditError(null);
                }}
                placeholder="Ex: Carlos Eduardo de Oliveira"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 uppercase focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Matrícula */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Matrícula *
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                value={matricula}
                onChange={e => {
                  setMatricula(e.target.value.replace(/\D/g, ''));
                  if (editError) setEditError(null);
                }}
                placeholder="Ex: 98401"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Empresa */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Empresa
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={organization}
                onChange={e => {
                  setOrganization(e.target.value.toUpperCase());
                  if (editError) setEditError(null);
                }}
                placeholder="Nome da empresa"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 uppercase focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Status de Presença */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Status de Presença
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('confirmed')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  status === 'confirmed'
                    ? 'bg-amber-950/70 border-amber-600 text-amber-300 shadow-inner'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Aguardando</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('checked_in')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  status === 'checked_in'
                    ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300 shadow-inner'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Presente</span>
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-cyan-950 flex items-center justify-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
