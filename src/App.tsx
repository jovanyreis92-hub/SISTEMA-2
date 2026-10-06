import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  EventItem,
  Participant,
  CheckInLog,
  AppBranding,
} from './types';
import {
  loadEvents,
  saveEvents,
  loadParticipants,
  saveParticipants,
  loadLogs,
  saveLogs,
  loadActiveEventId,
  saveActiveEventId,
  loadBranding,
  saveBranding,
} from './utils/storage';

import { Header } from './components/Header';
import { AdminDashboard } from './components/AdminDashboard';
import { FacialKiosk } from './components/FacialKiosk';
import { RegistrationPortal } from './components/RegistrationPortal';
import { ReportsView } from './components/ReportsView';
import { EventModal } from './components/EventModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { LayoutSettingsModal } from './components/LayoutSettingsModal';
import { ExcelPdfModal } from './components/ExcelPdfModal';

export default function App() {
  // Painel Principal: Inscrição & QR (default landing page)
  const [activeView, setActiveView] = useState<'register' | 'kiosk' | 'dashboard' | 'reports'>('register');
  
  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('biopass_is_admin') === 'true';
    }
    return false;
  });
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [pendingViewAfterLogin, setPendingViewAfterLogin] = useState<
    'dashboard' | 'kiosk' | 'register' | 'reports' | null
  >(null);

  // Layout & Branding state
  const [branding, setBranding] = useState<AppBranding>(() => loadBranding());
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);

  // Excel & PDF Import / Export Modal state
  const [isExcelPdfModalOpen, setIsExcelPdfModalOpen] = useState(false);

  // Data states
  const [events, setEvents] = useState<EventItem[]>(() => loadEvents());
  const [activeEventId, setActiveEventId] = useState<string>(() => loadActiveEventId());
  const [participants, setParticipants] = useState<Participant[]>(() => loadParticipants());
  const [logs, setLogs] = useState<CheckInLog[]>(() => loadLogs());

  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);

  // Save changes to storage
  useEffect(() => {
    saveEvents(events);
  }, [events]);

  useEffect(() => {
    saveParticipants(participants);
  }, [participants]);

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  useEffect(() => {
    saveActiveEventId(activeEventId);
  }, [activeEventId]);

  // Active event object
  const currentEvent = events.find(e => e.id === activeEventId) || events[0];

  // Handler for creating a new event
  const handleSaveNewEvent = (newEvent: EventItem) => {
    setEvents(prev => [newEvent, ...prev]);
    setActiveEventId(newEvent.id);
    setActiveView('dashboard');
  };

  // Handler for successful registration
  const handleRegisterSuccess = (newParticipant: Participant, updatedEvent: EventItem) => {
    setParticipants(prev => [newParticipant, ...prev]);
    setEvents(prev => prev.map(e => (e.id === updatedEvent.id ? updatedEvent : e)));
  };

  // Handler for completed check-in (from kiosk or manual)
  const handleCheckInCompleted = (updatedParticipant: Participant, updatedEvent: EventItem) => {
    setParticipants(prev =>
      prev.map(p => (p.id === updatedParticipant.id ? updatedParticipant : p))
    );
    setEvents(prev => prev.map(e => (e.id === updatedEvent.id ? updatedEvent : e)));
    
    // Add new log entry
    const newLog: CheckInLog = {
      id: `log-${Date.now()}`,
      eventId: updatedEvent.id,
      participantId: updatedParticipant.id,
      participantName: updatedParticipant.name,
      categoryId: updatedParticipant.categoryId,
      categoryName: updatedParticipant.categoryName,
      timestamp: updatedParticipant.checkInTime || new Date().toISOString(),
      confidence: updatedParticipant.checkInConfidence || 99.0,
      method: updatedParticipant.checkInMethod || 'face',
      status: 'granted',
      terminalId: updatedParticipant.terminalId || 'TOTEM-PORTAL-01',
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Batch import participants via Excel
  const handleBatchImportParticipants = (newOnes: Participant[]) => {
    setParticipants(prev => [...newOnes, ...prev]);
    // Update event registered count
    setEvents(prev =>
      prev.map(evt => {
        if (evt.id === currentEvent.id) {
          const updatedCategories = evt.categories.map(c => ({
            ...c,
            registeredCount: c.registeredCount + newOnes.length,
          }));
          return {
            ...evt,
            categories: updatedCategories,
          };
        }
        return evt;
      })
    );
  };

  // Layout & Branding change
  const handleSaveBranding = (newBranding: AppBranding) => {
    setBranding(newBranding);
    saveBranding(newBranding);
  };

  // Admin login success
  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('biopass_is_admin', 'true');
    }
    if (pendingViewAfterLogin) {
      setActiveView(pendingViewAfterLogin);
      setPendingViewAfterLogin(null);
    } else {
      setActiveView('dashboard');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('biopass_is_admin');
    }
    setActiveView('register');
  };

  const handleOpenAdminLoginPrompt = (targetView?: 'dashboard' | 'kiosk' | 'register' | 'reports') => {
    if (targetView) setPendingViewAfterLogin(targetView);
    setIsAdminLoginOpen(true);
  };

  const handleDeleteParticipant = (id: string) => {
    const p = participants.find(part => part.id === id);
    if (!p) return;
    setParticipants(prev => prev.filter(part => part.id !== id));
    setEvents(prev =>
      prev.map(evt => {
        if (evt.id === p.eventId) {
          const updatedCategories = evt.categories.map(c => {
            if (c.id === p.categoryId) {
              return { ...c, registeredCount: Math.max(0, c.registeredCount - 1) };
            }
            return c;
          });
          return { ...evt, categories: updatedCategories };
        }
        return evt;
      })
    );
  };

  const handleEditParticipantDetails = (updatedParticipant: Participant) => {
    setParticipants(prev =>
      prev.map(p => (p.id === updatedParticipant.id ? updatedParticipant : p))
    );
  };

  const handleDeleteEvent = (eventIdToDelete: string) => {
    const remainingEvents = events.filter(e => e.id !== eventIdToDelete);

    // Remove participants and logs belonging to this event
    setParticipants(prev => prev.filter(p => p.eventId !== eventIdToDelete));
    setLogs(prev => prev.filter(l => l.eventId !== eventIdToDelete));

    if (remainingEvents.length === 0) {
      const freshEvent: EventItem = {
        id: `evt-${Date.now()}`,
        title: 'Novo Evento',
        description: 'Local a definir',
        location: 'Prato do dia a definir',
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        registrationOpensAt: new Date().toISOString(),
        registrationClosesAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        categories: [
          {
            id: `cat-geral-${Date.now()}`,
            name: 'Participante',
            maxCapacity: 150,
            registeredCount: 0,
            checkedInCount: 0,
            color: '#06b6d4',
            price: 'Gratuito',
            description: 'Credencial de Acesso Geral',
          },
        ],
        totalCapacity: 150,
        status: 'open',
        bannerGradient: 'from-blue-600 via-indigo-600 to-purple-700',
        createdAt: new Date().toISOString(),
      };
      setEvents([freshEvent]);
      setActiveEventId(freshEvent.id);
    } else {
      setEvents(remainingEvents);
      if (activeEventId === eventIdToDelete) {
        setActiveEventId(remainingEvents[0].id);
      }
    }
  };

  const handleClearPreviousEvents = () => {
    const freshEvent: EventItem = {
      id: `evt-${Date.now()}`,
      title: 'Novo Evento',
      description: 'Centro de Convenções',
      location: 'Cardápio Executivo',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      registrationOpensAt: new Date().toISOString(),
      registrationClosesAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      categories: [
        {
          id: `cat-geral-${Date.now()}`,
          name: 'Participante',
          maxCapacity: 200,
          registeredCount: 0,
          checkedInCount: 0,
          color: '#06b6d4',
          price: 'Gratuito',
          description: 'Credencial oficial com validação biométrica facial.',
        },
      ],
      totalCapacity: 200,
      status: 'open',
      bannerGradient: 'from-cyan-600 via-blue-600 to-indigo-800',
      createdAt: new Date().toISOString(),
    };
    setParticipants([]);
    setLogs([]);
    setEvents([freshEvent]);
    setActiveEventId(freshEvent.id);
  };

  const handleDeleteMultipleParticipants = (ids: string[]) => {
    if (ids.length === 0) return;
    const idsSet = new Set(ids);
    const toRemove = participants.filter(p => idsSet.has(p.id));
    setParticipants(prev => prev.filter(p => !idsSet.has(p.id)));

    setEvents(prev =>
      prev.map(evt => {
        const matchingForEvent = toRemove.filter(p => p.eventId === evt.id);
        if (matchingForEvent.length === 0) return evt;
        const countsByCat: Record<string, number> = {};
        matchingForEvent.forEach(p => {
          countsByCat[p.categoryId] = (countsByCat[p.categoryId] || 0) + 1;
        });
        const updatedCategories = evt.categories.map(c => ({
          ...c,
          registeredCount: Math.max(0, c.registeredCount - (countsByCat[c.id] || 0)),
        }));
        return { ...evt, categories: updatedCategories };
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        events={events}
        activeEventId={activeEventId}
        onSelectEvent={setActiveEventId}
        onDeleteEvent={handleDeleteEvent}
        onOpenNewEventModal={() => setIsNewEventModalOpen(true)}
        onOpenLayoutModal={() => setIsLayoutModalOpen(true)}
        onOpenExcelPdfModal={() => setIsExcelPdfModalOpen(true)}
        isAdmin={isAdmin}
        onOpenAdminLogin={handleOpenAdminLoginPrompt}
        onAdminLogout={handleAdminLogout}
        branding={branding}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {/* 1. Inscrição & QR (Painel Principal) */}
        {activeView === 'register' && (
          <RegistrationPortal
            event={currentEvent}
            participants={participants}
            onRegisterSuccess={handleRegisterSuccess}
          />
        )}

        {/* 2. Totem Facial (Portaria com Reconhecimento) - SOMENTE NO PAINEL DO ADMINISTRADOR */}
        {activeView === 'kiosk' && (
          isAdmin ? (
            <FacialKiosk
              event={currentEvent}
              participants={participants.filter(p => p.eventId === currentEvent.id)}
              onCheckInCompleted={handleCheckInCompleted}
              onExitKiosk={() => setActiveView('dashboard')}
            />
          ) : (
            <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-cyan-950/70 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Totem Facial Restrito</h2>
              <p className="text-xs text-slate-400">
                O Totem Facial é de acesso exclusivo para a portaria no Painel do Administrador.
              </p>
              <button
                type="button"
                onClick={() => handleOpenAdminLoginPrompt('kiosk')}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold"
              >
                Fazer Login de Administrador
              </button>
            </div>
          )
        )}

        {/* 3. Dashboard Administrativo */}
        {activeView === 'dashboard' && (
          <AdminDashboard
            event={currentEvent}
            events={events}
            participants={participants}
            logs={logs}
            onOpenKiosk={() => setActiveView('kiosk')}
            onOpenRegistration={() => setActiveView('register')}
            onOpenReports={() => setActiveView('reports')}
            onOpenNewEventModal={() => setIsNewEventModalOpen(true)}
            onOpenLayoutModal={() => setIsLayoutModalOpen(true)}
            onOpenExcelPdfModal={() => setIsExcelPdfModalOpen(true)}
            onSelectEvent={setActiveEventId}
            onDeleteEvent={handleDeleteEvent}
            onClearPreviousEvents={handleClearPreviousEvents}
            onUpdateParticipant={handleCheckInCompleted}
            onEditParticipantDetails={handleEditParticipantDetails}
            onDeleteParticipant={handleDeleteParticipant}
            onDeleteMultipleParticipants={handleDeleteMultipleParticipants}
          />
        )}

        {/* 4. Relatórios de Frequência */}
        {activeView === 'reports' && (
          <ReportsView
            event={currentEvent}
            participants={participants}
            logs={logs}
            onOpenExcelPdfModal={() => setIsExcelPdfModalOpen(true)}
          />
        )}
      </main>

      {/* Admin Login Modal (ADIMIN1234) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => {
          setIsAdminLoginOpen(false);
          setPendingViewAfterLogin(null);
        }}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Layout & Logo Customization Modal */}
      <LayoutSettingsModal
        isOpen={isLayoutModalOpen}
        branding={branding}
        onClose={() => setIsLayoutModalOpen(false)}
        onSaveBranding={handleSaveBranding}
      />

      {/* Excel & PDF Import / Export Modal */}
      <ExcelPdfModal
        isOpen={isExcelPdfModalOpen}
        event={currentEvent}
        participants={participants}
        onClose={() => setIsExcelPdfModalOpen(false)}
        onImportParticipants={handleBatchImportParticipants}
      />

      {/* New Event Modal */}
      <EventModal
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        onSave={handleSaveNewEvent}
      />
    </div>
  );
}
