import React, { useState } from 'react';
import { AppBranding } from '../types';
import { X, Image as ImageIcon, Palette, Sparkles, Check, RefreshCw, Upload } from 'lucide-react';
import { notificationService } from '../utils/notificationService';

interface LayoutSettingsModalProps {
  isOpen: boolean;
  branding: AppBranding;
  onClose: () => void;
  onSaveBranding: (newBranding: AppBranding) => void;
}

export const LayoutSettingsModal: React.FC<LayoutSettingsModalProps> = ({
  isOpen,
  branding,
  onClose,
  onSaveBranding,
}) => {
  const [appName, setAppName] = useState(branding.appName);
  const [subtitle, setSubtitle] = useState(branding.subtitle);
  const [primaryColor, setPrimaryColor] = useState<AppBranding['primaryColor']>(branding.primaryColor);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(branding.logoUrl);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      setLogoUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaults = () => {
    setAppName('BioPass Eventos');
    setSubtitle('Reconhecimento Facial & Gestão em Tempo Real');
    setPrimaryColor('cyan');
    setLogoUrl(undefined);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppBranding = {
      appName: appName.trim() || 'BioPass Eventos',
      subtitle: subtitle.trim() || 'Controle Biométrico Inteligente',
      logoUrl,
      primaryColor,
      themeMode: 'dark',
    };

    onSaveBranding(updated);

    notificationService.notify({
      title: '🎨 Layout & Logo Atualizados',
      message: `Configurações visuais de "${updated.appName}" salvas com sucesso no sistema.`,
      type: 'system',
    });

    onClose();
  };

  const colorOptions: { id: AppBranding['primaryColor']; label: string; classBg: string; ring: string }[] = [
    { id: 'cyan', label: 'Ciano Cyber', classBg: 'bg-cyan-500', ring: 'ring-cyan-500' },
    { id: 'emerald', label: 'Verde Esmeralda', classBg: 'bg-emerald-500', ring: 'ring-emerald-500' },
    { id: 'blue', label: 'Azul Executivo', classBg: 'bg-blue-600', ring: 'ring-blue-500' },
    { id: 'purple', label: 'Roxo Moderno', classBg: 'bg-purple-600', ring: 'ring-purple-500' },
    { id: 'amber', label: 'Dourado / Âmbar', classBg: 'bg-amber-500', ring: 'ring-amber-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>Personalização de Layout & Logo</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Altere a marca, identidade visual e cores de todo o portal e do totem
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Live Preview Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Pré-visualização do Topo:
            </span>
            <div className="flex items-center justify-between p-3 bg-slate-900/90 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white/5 p-1" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                    {appName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">{appName || 'Nome da Marca'}</h4>
                  <p className="text-[10px] text-slate-400">{subtitle || 'Slogan ou subtítulo'}</p>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                Ativo
              </span>
            </div>
          </div>

          {/* App Name and Subtitle */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome do Sistema / Marca *
              </label>
              <input
                type="text"
                required
                value={appName}
                onChange={e => setAppName(e.target.value)}
                placeholder="Ex: BioPass Eventos"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Subtítulo / Descrição da Portaria
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="Ex: Reconhecimento Facial & Gestão em Tempo Real"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Logo da Empresa / Evento
            </label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-600" />
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer w-fit transition-colors">
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Enviar Imagem de Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(undefined)}
                    className="text-[11px] text-rose-400 hover:underline block"
                  >
                    Remover logo personalizada
                  </button>
                )}
                <p className="text-[10px] text-slate-500">
                  Formatos suportados: PNG, JPG ou SVG transparente (máx. 2MB)
                </p>
              </div>
            </div>
          </div>

          {/* Color Palette Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Cor de Destaque da Interface
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {colorOptions.map(opt => {
                const isSelected = primaryColor === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPrimaryColor(opt.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-white/40 ring-2 ring-white/20'
                        : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${opt.classBg}`} />
                    <span className="text-xs font-medium text-slate-200 truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restaurar Padrão
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-cyan-950 transition-all"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
