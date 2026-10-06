import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { EventItem } from '../types';
import {
  X,
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  Calendar,
  MapPin,
  Pencil,
  Share2,
  Sparkles,
} from 'lucide-react';

interface EventQrModalProps {
  isOpen: boolean;
  event: EventItem;
  onClose: () => void;
  onEditEvent?: (event: EventItem) => void;
}

export const EventQrModal: React.FC<EventQrModalProps> = ({
  isOpen,
  event,
  onClose,
  onEditEvent,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Direct registration URL for this event
  const getRegistrationUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?event=${encodeURIComponent(event.id)}`;
  };

  useEffect(() => {
    if (!isOpen || !event) return;

    const registrationUrl = getRegistrationUrl();
    QRCode.toDataURL(registrationUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#030712',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Erro ao gerar QR Code do Evento:', err));
  }, [isOpen, event]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const url = getRegistrationUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    const safeTitle = event.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    a.download = `qrcode-${safeTitle}-${event.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    const printContent = printableRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para imprimir o cartaz do evento.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cartaz QR Code - ${event.title}</title>
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 85vh;
              text-align: center;
            }
            .card {
              border: 3px solid #0284c7;
              border-radius: 24px;
              padding: 40px;
              max-width: 550px;
              width: 100%;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            }
            .badge {
              display: inline-block;
              background-color: #0284c7;
              color: white;
              font-size: 13px;
              font-weight: 700;
              padding: 6px 16px;
              border-radius: 9999px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 20px;
            }
            h1 {
              font-size: 28px;
              font-weight: 800;
              margin: 0 0 12px;
              color: #0f172a;
              line-height: 1.2;
            }
            .info {
              font-size: 15px;
              color: #475569;
              margin-bottom: 24px;
              line-height: 1.5;
            }
            .qr-wrapper {
              background: white;
              padding: 16px;
              border-radius: 16px;
              border: 2px dashed #94a3b8;
              display: inline-block;
              margin: 16px 0;
            }
            .qr-img {
              width: 280px;
              height: 280px;
              display: block;
            }
            .instructions {
              margin-top: 24px;
              font-size: 16px;
              font-weight: 700;
              color: #0284c7;
            }
            .sub-inst {
              font-size: 13px;
              color: #64748b;
              margin-top: 6px;
            }
            .footer {
              margin-top: 30px;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Inscrição & Credenciamento Oficial</div>
            <h1>${event.title}</h1>
            <div class="info">
              📅 <strong>Data:</strong> ${new Date(event.eventDate).toLocaleDateString('pt-BR')} às ${new Date(event.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}<br/>
              📍 <strong>Local:</strong> ${event.description || 'Auditório Master / Centro de Convenções'}
            </div>
            <div class="qr-wrapper">
              <img src="${qrDataUrl}" alt="QR Code do Evento" class="qr-img" />
            </div>
            <div class="instructions">
              📲 Aponte a câmera do seu celular para se cadastrar
            </div>
            <div class="sub-inst">
              Inscrição rápida com Biometria Facial e emissão imediata de passaporte digital.
            </div>
            <div class="footer">
              Sistema de Controle de Portaria & Credenciamento Biométrico • ${event.id}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 my-8">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-900/50">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Código QR do Evento
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 border border-cyan-800 text-cyan-300">
                  {event.id}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white mt-0.5 truncate max-w-md" title={event.title}>
                {event.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info & Quick Edit Bar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-slate-300">Link Direto para Inscrição & Credenciamento Facial</span>
          </div>

          {onEditEvent && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditEvent(event);
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Editar dados deste evento cadastrado (Tecla de Edição)"
            >
              <Pencil className="w-3.5 h-3.5 text-cyan-400" />
              <span>Editar Evento</span>
            </button>
          )}
        </div>

        {/* Printable/Display Card */}
        <div className="p-6 flex flex-col items-center">
          <div
            ref={printableRef}
            className="w-full max-w-sm bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 flex flex-col items-center text-center shadow-2xl relative overflow-hidden group"
          >
            {/* Top Badge */}
            <div className="px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/60 text-cyan-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Credenciamento Oficial</span>
            </div>

            {/* Event Name */}
            <h3 className="text-lg font-black text-white leading-snug line-clamp-2 px-2">
              {event.title}
            </h3>

            {/* Event Date & Location */}
            <div className="mt-2 space-y-1 text-xs text-slate-300">
              <div className="flex items-center justify-center gap-1 text-cyan-200/90 font-medium">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {new Date(event.eventDate).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(event.eventDate).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {event.description && (
                <div className="flex items-center justify-center gap-1 text-slate-400 text-[11px] truncate max-w-xs">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{event.description}</span>
                </div>
              )}
            </div>

            {/* QR Code Container */}
            <div className="mt-4 p-4 bg-white rounded-2xl shadow-xl border-4 border-cyan-400/30 flex items-center justify-center transition-transform hover:scale-105 duration-200">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code do Evento ${event.title}`}
                  className="w-56 h-56 object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-500 text-xs">
                  Gerando Código QR...
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-4 space-y-1">
              <p className="text-xs font-extrabold text-cyan-300 flex items-center justify-center gap-1">
                <Share2 className="w-3.5 h-3.5" />
                <span>Aponte a câmera para se cadastrar</span>
              </p>
              <p className="text-[10px] text-slate-400 max-w-xs">
                Inscrição com biometria facial instantânea para acesso à portaria
              </p>
            </div>
          </div>

          {/* Quick Copy Link Bar */}
          <div className="w-full mt-5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2 text-xs">
            <div className="truncate flex-1 text-left font-mono text-[11px] text-slate-400">
              <span className="text-slate-500 select-none">URL: </span>
              <span className="text-slate-200">{getRegistrationUrl()}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!qrDataUrl}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-950 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Baixar QR (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!qrDataUrl}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Imprimir Cartaz</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
