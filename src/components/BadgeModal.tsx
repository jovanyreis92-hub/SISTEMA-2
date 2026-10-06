import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Participant, EventItem } from '../types';
import { X, Printer, ShieldCheck, Download, Sparkles, CheckCircle2 } from 'lucide-react';

interface BadgeModalProps {
  participant: Participant;
  event: EventItem;
  onClose: () => void;
}

export const BadgeModal: React.FC<BadgeModalProps> = ({ participant, event, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    // Generate QR code encoding participant ID and event token
    const payload = JSON.stringify({
      biopass: 'v1',
      id: participant.id,
      name: participant.name,
      evt: event.id,
      cat: participant.categoryId,
      token: participant.qrToken,
    });

    QRCode.toDataURL(payload, {
      width: 280,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR code', err));
  }, [participant, event]);

  // Tecla ESC para fechar crachá
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const currentCategory = event.categories.find(c => c.id === participant.categoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950/70">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Credencial Digital BioPass
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            title="Fechar (Tecla ESC)"
          >
            <span className="text-[10px] font-mono text-slate-400 px-1 py-0.5 bg-slate-800 rounded border border-slate-700">ESC</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Badge Surface */}
        <div id="printable-badge" className="p-6 flex flex-col items-center bg-gradient-to-b from-slate-900 to-slate-950 relative">
          {/* Lanyard Slot Simulation */}
          <div className="w-14 h-2 rounded-full bg-slate-700/60 mb-5 border border-slate-600/40" />

          {/* Hologram Ribbon Header */}
          <div
            className="w-full py-1.5 px-3 rounded-lg text-center font-bold text-xs uppercase tracking-wider mb-4 shadow-sm"
            style={{
              backgroundColor: `${currentCategory?.color || '#3b82f6'}22`,
              color: currentCategory?.color || '#38bdf8',
              border: `1px solid ${currentCategory?.color || '#38bdf8'}66`,
            }}
          >
            {participant.categoryName}
          </div>

          {/* Attendee Photo with Biometric Verification Ring */}
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-cyan-400/80 shadow-lg shadow-cyan-500/20 p-0.5 bg-slate-950">
              <img
                src={participant.photoUrl}
                alt={participant.name}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 rounded-full p-1 shadow-md border-2 border-slate-900">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Attendee Info */}
          <h2 className="text-lg font-bold text-white text-center leading-tight">{participant.name}</h2>
          {participant.organization && (
            <p className="text-xs text-slate-400 text-center mt-0.5">Empresa: {participant.organization}</p>
          )}
          <p className="text-[11px] font-mono text-cyan-400 mt-1">
            Matrícula: {participant.matricula || participant.id}
          </p>

          {/* QR Code Container */}
          <div className="mt-4 p-3 bg-white rounded-xl shadow-md border border-slate-200/40 flex flex-col items-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code de Acesso" className="w-40 h-40" />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-slate-400 text-xs font-mono">
                Gerando QR...
              </div>
            )}
            <span className="text-[10px] font-mono text-slate-600 mt-1 font-semibold tracking-wider">
              ACESSO FACIAL + QR CODE
            </span>
          </div>

          {/* Event Details */}
          <div className="w-full mt-4 pt-3 border-t border-slate-800 text-left space-y-1.5 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Evento:</span>
              <span className="text-[11px] text-slate-100 font-bold text-right">{event.title}</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Local do Evento:</span>
              <span className="text-[11px] text-slate-200 text-right">{event.description || 'Centro de Eventos Principal'}</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] text-amber-400 font-semibold">Prato do Dia:</span>
              <span className="text-[11px] text-amber-300 font-bold text-right">{event.location || 'Menu do Dia'}</span>
            </div>
          </div>

          {/* Biometric Security Badge */}
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            <span>Biometria Facial Ativada na Portaria</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            Imprimir
          </button>
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`credencial-${participant.id}.png`}
              className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors text-center"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar QR
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
