import * as XLSX from 'xlsx';
import { Participant, EventItem } from '../types';

export interface ParsedAttendeeRow {
  name: string;
  matricula: string;
  organization: string;
  valid: boolean;
  error?: string;
}

/**
 * Exports participants to a real Excel (.xlsx) file
 */
export function exportParticipantsToExcel(participants: Participant[], event: EventItem) {
  const data = participants.map((p, idx) => ({
    'Nº': idx + 1,
    'Nome Completo': p.name,
    'Matrícula': p.matricula || p.id,
    'Empresa': p.organization || 'Não informada',
    'Status de Presença': p.status === 'checked_in' ? 'Presente' : 'Aguardando Entrada',
    'Data de Inscrição': new Date(p.registeredAt).toLocaleString('pt-BR'),
    'Horário de Entrada': p.checkInTime ? new Date(p.checkInTime).toLocaleString('pt-BR') : '-',
    'Método de Acesso': p.checkInMethod === 'face' ? 'Reconhecimento Facial' : p.checkInMethod === 'qrcode' ? 'QR Code' : p.checkInMethod === 'manual' ? 'Manual' : '-',
    'Acurácia Facial (%)': p.checkInConfidence ? `${p.checkInConfidence}%` : '-',
    'Portaria / Totem': p.terminalId || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 18 },
    { wch: 26 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 20 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Participantes');

  // Second sheet: Summary Metrics
  const total = participants.length;
  const present = participants.filter(p => p.status === 'checked_in').length;
  const absent = total - present;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  const summaryData = [
    { 'Métrica': 'Evento', 'Valor': event.title },
    { 'Métrica': 'Local', 'Valor': event.location },
    { 'Métrica': 'Data do Evento', 'Valor': new Date(event.eventDate).toLocaleDateString('pt-BR') },
    { 'Métrica': 'Total de Inscritos', 'Valor': total },
    { 'Métrica': 'Presentes (Check-in Realizado)', 'Valor': present },
    { 'Métrica': 'Ausentes / Aguardando', 'Valor': absent },
    { 'Métrica': 'Taxa de Comparecimento (%)', 'Valor': `${rate}%` },
    { 'Métrica': 'Capacidade Máxima do Evento', 'Valor': event.totalCapacity },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo Geral');

  const fileName = `participantes_${event.id}_${Date.now()}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Downloads a sample template Excel (.xlsx) file for batch import
 */
export function downloadSampleExcelTemplate() {
  const sampleData = [
    {
      'Nome Completo': 'Ana Carolina Ribeiro',
      'Matrícula': 'MAT-10045',
      'Empresa': 'Tech Solutions Brasil',
    },
    {
      'Nome Completo': 'Bruno Henrique Santos',
      'Matrícula': 'MAT-10046',
      'Empresa': 'Inova Telecom',
    },
    {
      'Nome Completo': 'Camila Ferreira Lima',
      'Matrícula': 'MAT-10047',
      'Empresa': 'Banco Digital Nexus',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 28 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo Importação');

  XLSX.writeFile(workbook, 'modelo_importacao_participantes.xlsx');
}

/**
 * Parses uploaded Excel (.xlsx, .xls, .csv) file
 */
export async function parseExcelFile(file: File): Promise<ParsedAttendeeRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to array of objects
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);

  const parsed: ParsedAttendeeRow[] = [];

  for (const row of rawRows) {
    // Find keys flexibly
    const nameKey = Object.keys(row).find(k => /nome/i.test(k)) || Object.keys(row)[0];
    const matKey = Object.keys(row).find(k => /matr|doc|id|codigo/i.test(k)) || Object.keys(row)[1];
    const orgKey = Object.keys(row).find(k => /empresa|institui|organ/i.test(k)) || Object.keys(row)[2];

    const rawName = String(row[nameKey] || '').trim();
    const rawMat = String(row[matKey] || '').trim();
    const rawOrg = String(row[orgKey] || '').trim();

    if (!rawName) {
      continue;
    }

    const valid = rawName.length >= 3;
    parsed.push({
      name: rawName,
      matricula: rawMat || `MAT-${Math.floor(10000 + Math.random() * 90000)}`,
      organization: rawOrg || 'Empresa Geral',
      valid,
      error: !valid ? 'Nome muito curto ou inválido' : undefined,
    });
  }

  return parsed;
}
