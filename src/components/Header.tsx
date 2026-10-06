import React from 'react';
import {
  ScanFace,
  LayoutDashboard,
  UserPlus,
  BarChart3,
  Lock,
  LogOut,
  ShieldCheck,
  Trash2,
  Pencil,
  QrCode,
} from 'lucide-react';
import { EventItem, AppBranding } from '../types';

interface HeaderProps {
  activeView: 'dashboard' | 'kiosk' | 'register' | 'reports';
  onSelectView: (view: 'dashboard' | 'kiosk' | 'register' | 'reports') => void;
  events: EventItem[];
  activeEventId: string;
  onSelectEvent: (id: string) => void;
  onOpenNewEventModal?: () => void;
  onOpenLayoutModal?: () => void;
  onOpenExcelPdfModal?: () => void;
  onEditEvent?: (event: EventItem) => void;
  onOpenEventQrModal?: (event: EventItem) => void;
  onDeleteEvent?: (id: string) => void;
  isAdmin: boolean;
  onOpenAdminLogin: (intendedView?: 'dashboard' | 'kiosk' | 'register' | 'reports') => void;
  onAdminLogout: () => void;
  branding: AppBranding;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  events,
  activeEventId,
  onSelectEvent,
  onEditEvent,
  onOpenEventQrModal,
  onDeleteEvent,
  isAdmin,
  onOpenAdminLogin,
  onAdminLogout,
  branding,
}) => {
  const handleNavClick = (view: 'dashboard' | 'kiosk' | 'register' | 'reports') => {
    // Only register is public; kiosk, dashboard and reports are admin-only
    if (!isAdmin && view !== 'register') {
      onOpenAdminLogin(view);
      return;
    }
    onSelectView(view);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand title & logo */}
        <div className="flex items-center gap-4 shrink-0">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onSelectView('register');
            }}
            className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="w-8 h-8 rounded-lg object-contain bg-white/5 p-1 border border-slate-700"
              />
            ) : (
              <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                <ScanFace className="w-4 h-4" />
              </span>
            )}
            <div className="flex flex-col">
              <span className="leading-tight">{branding.appName}</span>
              <span className="text-[10px] text-slate-400 font-normal hidden sm:inline leading-none">
                {branding.subtitle}
              </span>
            </div>
          </a>

          {/* Event Switcher (Exibido no Painel Administrador) */}
          {isAdmin && (
            <div className="hidden xl:flex items-center gap-1.5 pl-2">
              <select
                value={activeEventId}
                onChange={(e) => onSelectEvent(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium max-w-[200px] truncate"
              >
                {events.map(evt => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title}
                  </option>
                ))}
              </select>
              {onOpenEventQrModal && (
                <button
                  type="button"
                  onClick={() => {
                    const evt = events.find(e => e.id === activeEventId);
                    if (evt) onOpenEventQrModal(evt);
                  }}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Criar / Ver Código QR do Evento"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
              )}
              {onEditEvent && (
                <button
                  type="button"
                  onClick={() => {
                    const evt = events.find(e => e.id === activeEventId);
                    if (evt) onEditEvent(evt);
                  }}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Editar evento ativo (Tecla de Edição de Evento)"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {onDeleteEvent && (
                <button
                  type="button"
                  onClick={() => {
                    const evt = events.find(e => e.id === activeEventId);
                    if (window.confirm(`Deseja realmente excluir o evento "${evt?.title || 'selecionado'}" do sistema?`)) {
                      onDeleteEvent(activeEventId);
                    }
                  }}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                  title="Excluir evento selecionado"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links (OCULTAR NO PAINEL PRINCIPAL - EXIBIR SOMENTE NO PAINEL DO ADMINISTRADOR) */}
        {isAdmin && (
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
            {/* 1. Inscrição & QR */}
            <button
              onClick={() => handleNavClick('register')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeView === 'register'
                  ? 'bg-slate-800 text-cyan-400 shadow-inner ring-1 ring-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inscrição & QR</span>
            </button>

            {/* 2. Totem Facial (SOMENTE NO PAINEL DO ADMINISTRADOR) */}
            <button
              onClick={() => handleNavClick('kiosk')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeView === 'kiosk'
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <ScanFace className="w-3.5 h-3.5 text-cyan-400" />
              <span>Totem Facial</span>
            </button>

            {/* 3. Dashboard */}
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeView === 'dashboard'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-inner ring-1 ring-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            {/* 4. Frequência */}
            <button
              onClick={() => handleNavClick('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeView === 'reports'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-inner ring-1 ring-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Frequência</span>
            </button>
          </nav>
        )}

        {/* Zone 3: Admin Actions & Status */}
        <div className="flex items-center gap-2">
          {/* Admin Logged Status & Buttons */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5">
              {/* Logout Button */}
              <button
                onClick={onAdminLogout}
                className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Sair do Modo Administrador"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair Admin</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenAdminLogin()}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Acesso restrito ao Painel do Administrador"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Painel Administrador</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav subbar: SOMENTE NO PAINEL DO ADMINISTRADOR */}
      {isAdmin && (
        <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 px-2 py-1.5 bg-slate-950">
          <button
            onClick={() => handleNavClick('register')}
            className={`px-2 py-1 text-xs font-medium ${
              activeView === 'register' ? 'text-cyan-400 font-bold' : 'text-slate-400'
            }`}
          >
            Inscrição & QR
          </button>
          <button
            onClick={() => handleNavClick('kiosk')}
            className={`px-2 py-1 text-xs font-medium ${
              activeView === 'kiosk' ? 'text-cyan-400 font-bold' : 'text-slate-400'
            }`}
          >
            Totem Facial
          </button>
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`px-2 py-1 text-xs font-medium flex items-center gap-0.5 ${
              activeView === 'dashboard' ? 'text-cyan-400 font-bold' : 'text-slate-400'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleNavClick('reports')}
            className={`px-2 py-1 text-xs font-medium flex items-center gap-0.5 ${
              activeView === 'reports' ? 'text-cyan-400 font-bold' : 'text-slate-400'
            }`}
          >
            Frequência
          </button>
        </div>
      )}
    </header>
  );
};
