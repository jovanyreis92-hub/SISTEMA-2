import { EventItem, Participant, CheckInLog, PushNotificationItem } from '../types';

// Helper to create clean geometric SVG portraits as data URLs
export function createAvatarDataUrl(name: string, bgGradient: [string, string], accessories = 'glasses'): string {
  const initials = name
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient[0]}"/>
        <stop offset="100%" stop-color="${bgGradient[1]}"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" fill="url(#bg)"/>
    <!-- Head / Face Silhouette -->
    <circle cx="80" cy="65" r="34" fill="#fed7aa"/>
    <!-- Hair -->
    <path d="M 46 62 Q 80 24 114 62 Q 100 38 80 38 Q 60 38 46 62" fill="#1e293b"/>
    <!-- Eyes -->
    <ellipse cx="68" cy="64" rx="3.5" ry="4" fill="#0f172a"/>
    <ellipse cx="92" cy="64" rx="3.5" ry="4" fill="#0f172a"/>
    <!-- Nose & Smile -->
    <path d="M 80 68 L 78 75 L 82 75" stroke="#ea580c" stroke-width="1.5" fill="none"/>
    <path d="M 72 82 Q 80 88 88 82" stroke="#ea580c" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- Body / Shoulders -->
    <path d="M 28 160 Q 80 108 132 160 Z" fill="#0f172a"/>
    <path d="M 60 160 L 80 125 L 100 160 Z" fill="#ffffff" opacity="0.9"/>
    <!-- Biometric scan overlay marks -->
    <circle cx="68" cy="64" r="7" stroke="#06b6d4" stroke-width="1" stroke-dasharray="2 2" fill="none"/>
    <circle cx="92" cy="64" r="7" stroke="#06b6d4" stroke-width="1" stroke-dasharray="2 2" fill="none"/>
    <circle cx="80" cy="72" r="3" stroke="#06b6d4" stroke-width="0.8" fill="none"/>
    <!-- Initials in corner -->
    <text x="145" y="150" font-family="monospace" font-size="11" font-weight="bold" fill="#06b6d4" text-anchor="end">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Generates a mock 64-element feature vector seeded by string
export function generateDescriptorSeed(name: string): number[] {
  const vec = new Array(64).fill(0);
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  for (let i = 0; i < 64; i++) {
    const val = Math.sin(hash + i * 1.618) * 0.5 + 0.5;
    vec[i] = val;
  }
  const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0)) || 1;
  return vec.map(v => v / norm);
}

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'evt-ai-summit-2026',
    title: '2026',
    description: 'Congresso Internacional de Inovação em Inteligência Artificial, Visão Computacional e Credenciamento Biométrico em Alta Escala.',
    location: 'Centro de Convenções Rebouças - Auditório Master · São Paulo, SP',
    eventDate: '2026-10-18T08:30:00',
    registrationOpensAt: '2026-09-01T08:00:00', // Já aberto
    registrationClosesAt: '2026-10-17T23:59:00',
    bannerGradient: 'from-blue-600 via-indigo-600 to-purple-700',
    totalCapacity: 350,
    status: 'open',
    createdAt: '2026-09-01T08:00:00',
    categories: [
      {
        id: 'cat-geral',
        name: 'Participante',
        maxCapacity: 350,
        registeredCount: 220,
        checkedInCount: 165,
        color: '#06b6d4', // Cyan
        price: '',
        description: '',
      },
    ],
  },
];

export const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: 'BIO-1001',
    eventId: 'evt-ai-summit-2026',
    name: 'DRA. HELENA VASCONCELOS',
    matricula: '98401',
    organization: 'INSTITUTO DE VISÃO COMPUTACIONAL',
    categoryId: 'cat-geral',
    categoryName: 'Participante',
    photoUrl: createAvatarDataUrl('HELENA VASCONCELOS', ['#1e3a8a', '#3b82f6']),
    faceEmbeddings: generateDescriptorSeed('DRA. HELENA VASCONCELOS'),
    qrToken: 'BIOPASS:evt-ai-summit-2026:BIO-1001:SEC-88231',
    status: 'checked_in',
    registeredAt: '2026-09-02T10:14:00',
    checkInTime: '2026-10-18T08:05:12',
    checkInMethod: 'face',
    checkInConfidence: 99.4,
    terminalId: 'TOTEM-01-PORTAL-A',
  },
  {
    id: 'BIO-1002',
    eventId: 'evt-ai-summit-2026',
    name: 'CARLOS EDUARDO SILVEIRA',
    matricula: '88412',
    organization: 'INOVACORP BRASIL',
    categoryId: 'cat-geral',
    categoryName: 'Participante',
    photoUrl: createAvatarDataUrl('CARLOS EDUARDO SILVEIRA', ['#78350f', '#d97706']),
    faceEmbeddings: generateDescriptorSeed('CARLOS EDUARDO SILVEIRA'),
    qrToken: 'BIOPASS:evt-ai-summit-2026:BIO-1002:SEC-91024',
    status: 'checked_in',
    registeredAt: '2026-09-04T15:20:00',
    checkInTime: '2026-10-18T08:12:44',
    checkInMethod: 'face',
    checkInConfidence: 98.7,
    terminalId: 'TOTEM-01-PORTAL-A',
  },
  {
    id: 'BIO-1003',
    eventId: 'evt-ai-summit-2026',
    name: 'MARIANA DUARTE MENDES',
    matricula: '77319',
    organization: 'DIÁRIO TECH NEWS',
    categoryId: 'cat-geral',
    categoryName: 'Participante',
    photoUrl: createAvatarDataUrl('MARIANA DUARTE MENDES', ['#0e7490', '#06b6d4']),
    faceEmbeddings: generateDescriptorSeed('MARIANA DUARTE MENDES'),
    qrToken: 'BIOPASS:evt-ai-summit-2026:BIO-1003:SEC-77192',
    status: 'checked_in',
    registeredAt: '2026-09-08T09:40:00',
    checkInTime: '2026-10-18T08:18:03',
    checkInMethod: 'qrcode',
    checkInConfidence: 100.0,
    terminalId: 'TOTEM-02-PORTAL-B',
  },
  {
    id: 'BIO-1004',
    eventId: 'evt-ai-summit-2026',
    name: 'LUCAS GABRIEL ALBUQUERQUE',
    matricula: '66104',
    organization: 'USP - LAB DE COMPUTAÇÃO',
    categoryId: 'cat-geral',
    categoryName: 'Participante',
    photoUrl: createAvatarDataUrl('LUCAS GABRIEL ALBUQUERQUE', ['#5b21b6', '#8b5cf6']),
    faceEmbeddings: generateDescriptorSeed('LUCAS GABRIEL ALBUQUERQUE'),
    qrToken: 'BIOPASS:evt-ai-summit-2026:BIO-1004:SEC-41908',
    status: 'checked_in',
    registeredAt: '2026-09-10T14:12:00',
    checkInTime: '2026-10-18T08:24:50',
    checkInMethod: 'face',
    checkInConfidence: 97.9,
    terminalId: 'TOTEM-01-PORTAL-A',
  },
  {
    id: 'BIO-1005',
    eventId: 'evt-ai-summit-2026',
    name: 'BEATRIZ FAGUNDES LIMA',
    matricula: '55490',
    organization: 'CLOUD ENTERPRISE SOLUTIONS',
    categoryId: 'cat-geral',
    categoryName: 'Participante',
    photoUrl: createAvatarDataUrl('BEATRIZ FAGUNDES LIMA', ['#1e293b', '#475569']),
    faceEmbeddings: generateDescriptorSeed('BEATRIZ FAGUNDES LIMA'),
    qrToken: 'BIOPASS:evt-ai-summit-2026:BIO-1005:SEC-66120',
    status: 'confirmed',
    registeredAt: '2026-09-12T11:00:00',
  },
  {
    id: 'BIO-1006',
    eventId: 'evt-ai-summit-2026',
    name: 'RAFAEL BITTENCOURT DE SOUZA',
    matricula: '44120',
    organization: 'FINTECH BRAZIL PAY',
    categoryId: 'cat-geral',
    categoryName: 'Participante',
    photoUrl: createAvatarDataUrl('RAFAEL BITTENCOURT', ['#92400e', '#f59e0b']),
    faceEmbeddings: generateDescriptorSeed('RAFAEL BITTENCOURT DE SOUZA'),
    qrToken: 'BIOPASS:evt-ai-summit-2026:BIO-1006:SEC-33901',
    status: 'confirmed',
    registeredAt: '2026-09-14T16:30:00',
  },
  {
    id: 'BIO-1007',
    eventId: 'evt-ai-summit-2026',
    name: 'FERNANDA NOGUEIRA COSTA',
    matricula: '33941',
    organization: 'AI ROBOTICS GLOBAL',
    categoryId: 'cat-geral',
    categoryName: 'Participante',
    photoUrl: createAvatarDataUrl('FERNANDA NOGUEIRA COSTA', ['#065f46', '#10b981']),
    faceEmbeddings: generateDescriptorSeed('FERNANDA NOGUEIRA COSTA'),
    qrToken: 'BIOPASS:evt-ai-summit-2026:BIO-1007:SEC-12094',
    status: 'confirmed',
    registeredAt: '2026-09-15T09:10:00',
  },
];

export const INITIAL_LOGS: CheckInLog[] = [
  {
    id: 'log-01',
    eventId: 'evt-ai-summit-2026',
    participantId: 'BIO-1001',
    participantName: 'Dra. Helena Vasconcelos',
    categoryId: 'cat-geral',
    categoryName: 'Participante',
    timestamp: '2026-10-18T08:05:12',
    confidence: 99.4,
    method: 'face',
    status: 'granted',
    terminalId: 'TOTEM-01-PORTAL-A',
    details: 'Validação Facial 68-Keypoints · Latência 280ms',
  },
  {
    id: 'log-02',
    eventId: 'evt-ai-summit-2026',
    participantId: 'BIO-1002',
    participantName: 'Carlos Eduardo Silveira',
    categoryId: 'cat-geral',
    categoryName: 'Participante',
    timestamp: '2026-10-18T08:12:44',
    confidence: 98.7,
    method: 'face',
    status: 'granted',
    terminalId: 'TOTEM-01-PORTAL-A',
    details: 'Validação Facial Express · Acesso liberado',
  },
  {
    id: 'log-03',
    eventId: 'evt-ai-summit-2026',
    participantId: 'BIO-1003',
    participantName: 'Mariana Duarte Mendes',
    categoryId: 'cat-geral',
    categoryName: 'Participante',
    timestamp: '2026-10-18T08:18:03',
    confidence: 100.0,
    method: 'qrcode',
    status: 'granted',
    terminalId: 'TOTEM-02-PORTAL-B',
    details: 'Leitura QR Code Passaporte Digital · Acesso liberado',
  },
  {
    id: 'log-04',
    eventId: 'evt-ai-summit-2026',
    participantId: 'BIO-1004',
    participantName: 'Lucas Gabriel Albuquerque',
    categoryId: 'cat-geral',
    categoryName: 'Participante',
    timestamp: '2026-10-18T08:24:50',
    confidence: 97.9,
    method: 'face',
    status: 'granted',
    terminalId: 'TOTEM-01-PORTAL-A',
    details: 'Validação Facial Instantânea · Catraca liberada',
  },
];

export const INITIAL_NOTIFICATIONS: PushNotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Inscrições Liberadas',
    message: 'As inscrições para o evento "2026" foram abertas ao público.',
    type: 'event_open',
    timestamp: '2026-09-01T08:00:00',
    read: true,
  },
  {
    id: 'notif-2',
    title: 'Vagas Esgotadas: Palestrantes',
    message: 'O limite de 15 vagas para a categoria "Palestrante / Speaker" foi atingido e encerrado.',
    type: 'capacity',
    timestamp: '2026-09-10T11:45:00',
    read: true,
  },
  {
    id: 'notif-3',
    title: 'Biometria Facial Registrada',
    message: 'Foto de Dra. Helena Vasconcelos indexada com sucesso na base de reconhecimento.',
    type: 'biometrics',
    timestamp: '2026-09-02T10:15:30',
    read: false,
    participantName: 'Dra. Helena Vasconcelos',
  },
  {
    id: 'notif-4',
    title: 'Check-in Realizado: Portal A',
    message: 'Carlos Eduardo Silveira ingressou no evento via Totem Facial (98.7% match).',
    type: 'checkin',
    timestamp: '2026-10-18T08:12:44',
    read: false,
    participantName: 'Carlos Eduardo Silveira',
  },
];
