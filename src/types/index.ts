export interface EventCategory {
  id: string;
  name: string;
  maxCapacity: number;
  registeredCount: number;
  checkedInCount: number;
  color: string;
  price: string;
  description: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  location: string;
  eventDate: string; // ISO string
  registrationOpensAt: string; // ISO string
  registrationClosesAt: string; // ISO string
  categories: EventCategory[];
  totalCapacity: number;
  status: 'upcoming' | 'open' | 'sold_out' | 'closed';
  bannerGradient: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  matricula: string; // Matrícula do participante
  email?: string;
  document?: string; // CPF or ID
  phone?: string;
  organization?: string; // Empresa
  categoryId: string;
  categoryName: string;
  photoUrl: string; // Base64 or URL
  faceEmbeddings?: number[];
  qrToken: string;
  status: 'confirmed' | 'checked_in' | 'cancelled';
  registeredAt: string;
  checkInTime?: string;
  checkInMethod?: 'face' | 'qrcode' | 'manual';
  checkInConfidence?: number;
  terminalId?: string;
}

export interface CheckInLog {
  id: string;
  eventId: string;
  participantId: string;
  participantName: string;
  categoryId: string;
  categoryName: string;
  timestamp: string;
  confidence: number;
  method: 'face' | 'qrcode' | 'manual';
  status: 'granted' | 'denied' | 'review';
  snapshotUrl?: string;
  terminalId: string;
  details?: string;
}

export interface PushNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'registration' | 'biometrics' | 'checkin' | 'capacity' | 'event_open' | 'system';
  timestamp: string;
  read: boolean;
  participantName?: string;
  eventId?: string;
}

export interface AppBranding {
  appName: string;
  subtitle: string;
  logoUrl?: string;
  primaryColor: 'cyan' | 'emerald' | 'blue' | 'purple' | 'amber';
  themeMode: 'dark' | 'slate';
}

