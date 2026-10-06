import { EventItem, Participant, CheckInLog, AppBranding } from '../types';
import { INITIAL_EVENTS, INITIAL_PARTICIPANTS, INITIAL_LOGS } from './mockData';

const STORAGE_KEYS = {
  EVENTS: 'biopass_events_v5',
  PARTICIPANTS: 'biopass_participants_v5',
  LOGS: 'biopass_logs_v5',
  NOTIFICATIONS: 'biopass_notifications_v5',
  ACTIVE_EVENT_ID: 'biopass_active_event_id_v5',
  BRANDING: 'biopass_branding_v5',
};

export const DEFAULT_BRANDING: AppBranding = {
  appName: 'BioPass Eventos',
  subtitle: 'Reconhecimento Facial & Gestão em Tempo Real',
  primaryColor: 'cyan',
  themeMode: 'dark',
};

// Automatic cleanup of legacy storage if present
if (typeof window !== 'undefined') {
  try {
    const oldKeys = [
      'biopass_events_v1', 'biopass_participants_v1', 'biopass_logs_v1', 'biopass_notifications_v1', 'biopass_active_event_id_v1',
      'biopass_events_v2', 'biopass_participants_v2', 'biopass_logs_v2', 'biopass_notifications_v2', 'biopass_active_event_id_v2',
      'biopass_events_v3', 'biopass_participants_v3', 'biopass_logs_v3', 'biopass_notifications_v3', 'biopass_active_event_id_v3',
      'biopass_events_v4', 'biopass_participants_v4', 'biopass_logs_v4', 'biopass_notifications_v4', 'biopass_active_event_id_v4',
    ];
    oldKeys.forEach(k => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}

export function loadBranding(): AppBranding {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BRANDING);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return DEFAULT_BRANDING;
}

export function saveBranding(branding: AppBranding): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BRANDING, JSON.stringify(branding));
  } catch {
    // fallback
  }
}

export function loadEvents(): EventItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (raw !== null) {
      const parsed: EventItem[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(e => e.id !== 'evt-cyber-security');
      }
    }
  } catch {
    // fallback
  }
  return INITIAL_EVENTS;
}

export function saveEvents(events: EventItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  } catch {
    // fallback
  }
}

export function loadParticipants(): Participant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
    if (raw) {
      const parsed: Participant[] = JSON.parse(raw);
      return parsed.map(p => ({
        ...p,
        name: p.name.toUpperCase(),
        matricula: (p.matricula || '').replace(/\D/g, '') || p.id.replace(/\D/g, ''),
        organization: (p.organization || '').toUpperCase(),
      }));
    }
  } catch {
    // fallback
  }
  return INITIAL_PARTICIPANTS;
}

export function saveParticipants(participants: Participant[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
  } catch {
    // fallback
  }
}

export function loadLogs(): CheckInLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return INITIAL_LOGS;
}

export function saveLogs(logs: CheckInLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  } catch {
    // fallback
  }
}

export function loadActiveEventId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
    if (raw) return raw;
  } catch {
    // fallback
  }
  return INITIAL_EVENTS[0]?.id || '';
}

export function saveActiveEventId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT_ID, id);
  } catch {
    // fallback
  }
}

/**
 * Checks event status based on current time and vacancies
 */
export function computeEventStatus(event: EventItem): 'upcoming' | 'open' | 'sold_out' | 'closed' {
  const now = new Date().getTime();
  const opensAt = new Date(event.registrationOpensAt).getTime();
  const closesAt = new Date(event.registrationClosesAt).getTime();

  if (now < opensAt) {
    return 'upcoming';
  }
  if (now > closesAt) {
    return 'closed';
  }

  // Check vacancies
  const totalRegistered = event.categories.reduce((acc, cat) => acc + cat.registeredCount, 0);
  if (totalRegistered >= event.totalCapacity) {
    return 'sold_out';
  }

  return 'open';
}

/**
 * Perform biometric or QR check-in
 */
export function recordCheckIn(
  participant: Participant,
  event: EventItem,
  method: 'face' | 'qrcode' | 'manual',
  confidence: number,
  terminalId: string,
  snapshotUrl?: string
): { updatedParticipant: Participant; log: CheckInLog; updatedEvent: EventItem } {
  const nowStr = new Date().toISOString();
  
  const updatedParticipant: Participant = {
    ...participant,
    status: 'checked_in',
    checkInTime: nowStr,
    checkInMethod: method,
    checkInConfidence: confidence,
    terminalId,
  };

  const log: CheckInLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    eventId: event.id,
    participantId: participant.id,
    participantName: participant.name,
    categoryId: participant.categoryId,
    categoryName: participant.categoryName,
    timestamp: nowStr,
    confidence,
    method,
    status: 'granted',
    terminalId,
    snapshotUrl,
    details: method === 'face'
      ? `Reconhecimento Facial (${confidence.toFixed(1)}% match) · Portaria ${terminalId}`
      : method === 'qrcode'
      ? `Validação de QR Code · Portaria ${terminalId}`
      : `Check-in Manual Administrativo · Portaria ${terminalId}`,
  };

  // Update category checkedInCount
  const updatedCategories = event.categories.map(cat => {
    if (cat.id === participant.categoryId) {
      return {
        ...cat,
        checkedInCount: cat.checkedInCount + 1,
      };
    }
    return cat;
  });

  const updatedEvent: EventItem = {
    ...event,
    categories: updatedCategories,
  };

  return { updatedParticipant, log, updatedEvent };
}

export function resetAllStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    localStorage.removeItem(STORAGE_KEYS.PARTICIPANTS);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
  } catch {
    // fallback
  }
}
