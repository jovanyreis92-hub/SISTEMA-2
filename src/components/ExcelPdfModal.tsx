import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { EventItem, Participant } from '../types';
import {
  X,
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Users,
  Printer,
  Sparkles,
  ArrowRight,
  Database,
} from 'lucide-react';
import { notificationService } from '../utils/notificationService';
import { generateDescriptorSeed, createAvatarDataUrl } from '../utils/mockData';

interface ExcelPdfModalProps {
  isOpen: boolean;
  event: EventItem;
  participants: Participant[];
  onClose: () => void;
  onImportParticipants: (newParticipants: Participant[]) => void;
}

export const ExcelPdfModal: React.FC<ExcelPdfModalProps> = ({
  isOpen,
  event,
  participants,
  onClose,
  onImportParticipants,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importPreview, setImportPreview] = useState<
    Array<{ name: string; matricula: string; organization: string }>
  >([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const eventParticipants = participants.filter(p => p.eventId === event.id);

  // 1. Export real Excel (.xlsx)
  const handleExportXLSX = () => {
    const dataRows = eventParticipants.map((p, idx) => ({
      'Nº': idx + 1,
      'ID Participante': p.id,
      'Nome Completo': p.name,
      'Matrícula': p.matricula || p.id,
      'Empresa': p.organization || 'Não informada',
      'Evento': event.title,
      'Local do Evento': event.description || 'Centro de Eventos Principal',
      'Prato do Dia': event.location || 'Menu do Dia',
      'Status Presença': p.status === 'checked_in' ? 'Presente' : 'Aguardando',
      'Horário de Entrada': p.checkInTime ? new Date(p.checkInTime).toLocaleString('pt-BR') : '-',
      'Método de Check-in': p.checkInMethod === 'face'
        ? 'Facial Biométrico'
        : p.checkInMethod === 'qrcode'
        ? 'QR Code'
        : p.checkInMethod === 'manual'
        ? 'Manual'
        : '-',
      'Confiança Facial (%)': p.checkInConfidence ? `${p.checkInConfidence}%` : '-',
      'Terminal / Portaria': p.terminalId || '-',
      'Data de Inscrição': new Date(p.registeredAt).toLocaleString('pt-BR'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);

    // Auto-fit columns
    const colWidths = [
      { wch: 5 },
      { wch: 18 },
      { wch: 28 },
      { wch: 16 },
      { wch: 24 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participantes');

    // Summary sheet
    const summaryData = [
      { 'Métrica': 'Evento', 'Valor': event.title },
      { 'Métrica': 'Data do Evento', 'Valor': new Date(event.eventDate).toLocaleDateString('pt-BR') },
      { 'Métrica': 'Local', 'Valor': event.location },
      { 'Métrica': 'Capacidade Total', 'Valor': event.totalCapacity },
      { 'Métrica': 'Total de Inscritos', 'Valor': eventParticipants.length },
      { 'Métrica': 'Total de Presentes', 'Valor': eventParticipants.filter(p => p.status === 'checked_in').length },
      {
        'Métrica': 'Taxa de Comparecimento',
        'Valor': `${eventParticipants.length > 0 ? Math.round((eventParticipants.filter(p => p.status === 'checked_in').length / eventParticipants.length) * 100) : 0}%`,
      },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo do Evento');

    XLSX.writeFile(workbook, `Participantes_${event.id}.xlsx`);

    notificationService.notify({
      title: '📊 Exportação Excel (.xlsx) Concluída',
      message: `Planilha com ${eventParticipants.length} participantes gerada e baixada com sucesso.`,
      type: 'system',
      eventId: event.id,
    });
  };

  // 2. Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Nome Completo',
      'Matricula',
      'Empresa',
      'Status',
      'Horario Check-in',
      'Metodo',
      'Confianca Biometrica',
      'Portaria',
    ];

    const rows = eventParticipants.map(p => [
      `"${p.id}"`,
      `"${p.name}"`,
      `"${p.matricula || p.id}"`,
      `"${p.organization || ''}"`,
      `"${p.status === 'checked_in' ? 'Presente' : 'Aguardando'}"`,
      `"${p.checkInTime ? new Date(p.checkInTime).toLocaleString('pt-BR') : '-'}"`,
      `"${p.checkInMethod || '-'}"`,
      `"${p.checkInConfidence ? p.checkInConfidence + '%' : '-'}"`,
      `"${p.terminalId || '-'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Participantes_${event.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Export / Print PDF
  const handleExportPDF = () => {
    window.print();
  };

  // 4. File Upload (Excel .xlsx / .csv)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = evt => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

        if (!json || json.length === 0) {
          setImportError('O arquivo selecionado está vazio ou não possui linhas válidas.');
          return;
        }

        // Map column headers flexible
        const parsedRows = json
          .map(row => {
            const keys = Object.keys(row);
            const findVal = (terms: string[]) => {
              for (const term of terms) {
                const k = keys.find(key => key.toLowerCase().trim().includes(term));
                if (k && row[k]) return String(row[k]).trim();
              }
              return '';
            };

            const name = findVal(['nome', 'name', 'participante', 'completo']).trim().toUpperCase();
            const rawMatricula = findVal(['matricula', 'matrícula', 'id', 'codigo', 'registro']);
            const matriculaDigits = rawMatricula.replace(/\D/g, '') || `${Math.floor(10000 + Math.random() * 90000)}`;
            const organization = (findVal(['empresa', 'instituicao', 'instituição', 'org', 'company']) || 'GERAL').trim().toUpperCase();

            return {
              name,
              matricula: matriculaDigits,
              organization,
            };
          })
          .filter(r => r.name.length > 1);

        if (parsedRows.length === 0) {
          setImportError(
            'Não foi possível encontrar a coluna de Nome no arquivo. Certifique-se de ter uma coluna chamada "Nome", "Matrícula" e "Empresa".'
          );
          return;
        }

        // Filter out duplicate names or matriculas that already exist in the event
        const existingNames = new Set(eventParticipants.map(p => p.name.trim().toUpperCase()));
        const existingMatriculas = new Set(eventParticipants.map(p => p.matricula.trim()));

        const seenNamesInSheet = new Set<string>();
        const seenMatriculasInSheet = new Set<string>();
        const uniqueRows: typeof parsedRows = [];
        let duplicateCount = 0;

        for (const row of parsedRows) {
          if (
            existingNames.has(row.name) ||
            existingMatriculas.has(row.matricula) ||
            seenNamesInSheet.has(row.name) ||
            seenMatriculasInSheet.has(row.matricula)
          ) {
            duplicateCount++;
            continue;
          }
          seenNamesInSheet.add(row.name);
          seenMatriculasInSheet.add(row.matricula);
          uniqueRows.push(row);
        }

        if (duplicateCount > 0) {
          notificationService.notify({
            title: '⚠️ Duplicidades Detectadas',
            message: `${duplicateCount} participante(s) foram desconsiderados por já possuírem mesmo Nome ou Matrícula no evento.`,
            type: 'system',
            eventId: event.id,
          });
        }

        if (uniqueRows.length === 0) {
          setImportError('Todos os participantes da planilha já constam cadastrados neste evento (mesmo nome ou matrícula).');
          return;
        }

        setImportPreview(uniqueRows);
      } catch (err) {
        console.error(err);
        setImportError('Erro ao ler a planilha. Certifique-se de que é um arquivo .xlsx ou .csv válido.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // 5. Confirm Import
  const handleConfirmImport = () => {
    if (importPreview.length === 0) return;

    const newParticipants: Participant[] = importPreview.map((item, idx) => {
      const pid = `BIO-${Math.floor(2000 + Math.random() * 8000)}-${idx + 1}`;
      const defaultCategory = event.categories[0] || {
        id: 'cat-geral',
        name: 'Participante',
        maxCapacity: event.totalCapacity,
        registeredCount: 0,
        checkedInCount: 0,
        color: '#06b6d4',
        price: 'Gratuito',
        description: 'Inscrição oficial',
      };

      return {
        id: pid,
        eventId: event.id,
        name: item.name.toUpperCase(),
        matricula: item.matricula.replace(/\D/g, ''),
        organization: item.organization.toUpperCase(),
        categoryId: defaultCategory.id,
        categoryName: 'Participante',
        photoUrl: createAvatarDataUrl(item.name, ['#0284c7', '#4f46e5']),
        faceEmbeddings: generateDescriptorSeed(item.name),
        qrToken: `BIOPASS:${event.id}:${pid}:SEC-${Math.floor(10000 + Math.random() * 90000)}`,
        status: 'confirmed',
        registeredAt: new Date().toISOString(),
      };
    });

    onImportParticipants(newParticipants);

    notificationService.notify({
      title: '📥 Importação Concluída com Sucesso',
      message: `${newParticipants.length} participantes foram cadastrados no evento "${event.title}" via Excel.`,
      type: 'registration',
      eventId: event.id,
    });

    onClose();
  };

  // Download template
  const handleDownloadTemplate = () => {
    const templateData = [
      { 'Nome Completo': 'CARLOS SILVA', 'Matrícula': '10023', 'Empresa': 'TECH SOLUTIONS' },
      { 'Nome Completo': 'MARIANA SOUZA', 'Matrícula': '10024', 'Empresa': 'INOVA DIGITAL' },
      { 'Nome Completo': 'ROBERTO LIMA', 'Matrícula': '10025', 'Empresa': 'BANCO FUTURO' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Importacao');
    XLSX.writeFile(wb, 'Modelo_Importacao_Participantes.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Central de Dados · Excel & PDF</h2>
              <p className="text-xs text-slate-400">
                Exportação de relatórios e importação em lote para o evento: {event.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Dados (Excel & PDF)</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Participantes (Excel / CSV)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Excel Option */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-emerald-500/50 transition-colors">
                  <div className="space-y-1.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Planilha Excel (.xlsx)</h3>
                    <p className="text-xs text-slate-400">
                      Exporta pasta de trabalho completa com dados dos {eventParticipants.length} inscritos e aba de resumo.
                    </p>
                  </div>
                  <button
                    onClick={handleExportXLSX}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Excel</span>
                  </button>
                </div>

                {/* CSV Option */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-cyan-500/50 transition-colors">
                  <div className="space-y-1.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Arquivo CSV (.csv)</h3>
                    <p className="text-xs text-slate-400">
                      Formato aberto delimitado por ponto e vírgula com suporte UTF-8 para integração.
                    </p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar CSV</span>
                  </button>
                </div>

                {/* PDF Option */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-indigo-500/50 transition-colors">
                  <div className="space-y-1.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                      <Printer className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Relatório PDF Oficial</h3>
                    <p className="text-xs text-slate-400">
                      Gera relatório formatado para impressão ou salvamento em PDF com cabeçalho oficial.
                    </p>
                  </div>
                  <button
                    onClick={handleExportPDF}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / PDF</span>
                  </button>
                </div>
              </div>

              {/* Data Summary Preview */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase font-mono">
                  Registros a serem exportados:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Total Inscritos</span>
                    <span className="text-base font-bold font-mono text-white">
                      {eventParticipants.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Presentes</span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {eventParticipants.filter(p => p.status === 'checked_in').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Aguardando</span>
                    <span className="text-base font-bold font-mono text-amber-400">
                      {eventParticipants.filter(p => p.status === 'confirmed').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Vagas Livres</span>
                    <span className="text-base font-bold font-mono text-cyan-400">
                      {Math.max(0, event.totalCapacity - eventParticipants.length)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-5">
              {/* Instructions and Template Download */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Estrutura Esperada da Planilha</h4>
                  <p className="text-[11px] text-slate-400">
                    Colunas necessárias: <strong>Nome</strong>, <strong>Matrícula</strong> e <strong>Empresa</strong>.
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Modelo Excel</span>
                </button>
              </div>

              {/* Upload Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-all flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {importFileName ? importFileName : 'Clique para selecionar arquivo Excel (.xlsx) ou CSV'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Arraste ou selecione sua lista de participantes
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {importError && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Preview of Imported Records */}
              {importPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{importPreview.length} participantes prontos para importação:</span>
                    </h4>
                    <span className="text-[11px] font-mono text-cyan-400">
                      Pré-visualização das 5 primeiras linhas
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Nome</th>
                          <th className="py-2 px-3">Matrícula</th>
                          <th className="py-2 px-3">Empresa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                        {importPreview.slice(0, 10).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-mono text-slate-500">{i + 1}</td>
                            <td className="py-2 px-3 font-medium text-slate-200">{row.name}</td>
                            <td className="py-2 px-3 font-mono text-cyan-400">{row.matricula}</td>
                            <td className="py-2 px-3 text-slate-300">{row.organization}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {importPreview.length > 10 && (
                    <p className="text-[11px] text-slate-500 text-center font-mono">
                      ... e mais {importPreview.length - 10} participantes no arquivo.
                    </p>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleConfirmImport}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Confirmar Importação de {importPreview.length} Participantes</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
