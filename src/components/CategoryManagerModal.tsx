import React, { useState } from 'react';
import { EventItem, EventCategory } from '../types';
import { X, Plus, Trash2, Edit2, Check, AlertCircle, Users } from 'lucide-react';
import { notificationService } from '../utils/notificationService';

interface CategoryManagerModalProps {
  isOpen: boolean;
  event: EventItem;
  onClose: () => void;
  onUpdateCategories: (updatedCategories: EventCategory[]) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  event,
  onClose,
  onUpdateCategories,
}) => {
  const [categories, setCategories] = useState<EventCategory[]>(event.categories);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New category form fields
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCapacity, setNewCapacity] = useState(50);
  const [newPrice, setNewPrice] = useState('Gratuito');
  const [newColor, setNewColor] = useState('#06b6d4');
  const [newDescription, setNewDescription] = useState('');

  if (!isOpen) return null;

  const handleRemoveCategory = (catId: string, catName: string) => {
    if (categories.length <= 1) {
      alert('O evento precisa ter ao menos uma categoria para permitir inscrições.');
      return;
    }

    const updated = categories.filter(c => c.id !== catId);
    setCategories(updated);
    onUpdateCategories(updated);

    notificationService.notify({
      title: '🗑️ Categoria Removida',
      message: `A categoria "${catName}" foi excluída do evento "${event.title}".`,
      type: 'system',
      eventId: event.id,
    });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newCat: EventCategory = {
      id: `cat-${Date.now()}`,
      name: newName.trim(),
      maxCapacity: Number(newCapacity) || 50,
      registeredCount: 0,
      checkedInCount: 0,
      color: newColor,
      price: newPrice.trim() || 'Gratuito',
      description: newDescription.trim() || 'Acesso padrão ao evento com credencial.',
    };

    const updated = [...categories, newCat];
    setCategories(updated);
    onUpdateCategories(updated);

    // Reset form
    setNewName('');
    setNewCapacity(50);
    setNewPrice('Gratuito');
    setNewDescription('');
    setShowAddForm(false);

    notificationService.notify({
      title: '✨ Nova Categoria Adicionada',
      message: `Categoria "${newCat.name}" criada com ${newCat.maxCapacity} vagas disponíveis.`,
      type: 'system',
      eventId: event.id,
    });
  };

  const handleSaveEdit = (catId: string, field: keyof EventCategory, val: string | number) => {
    const updated = categories.map(c => {
      if (c.id === catId) {
        return { ...c, [field]: val };
      }
      return c;
    });
    setCategories(updated);
    onUpdateCategories(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Gerenciar Categorias & Limites</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Adicione, edite ou remova categorias e vagas do evento &ldquo;{event.title}&rdquo;
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
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Active Categories List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Categorias Atuais ({categories.length})
              </span>
              {!showAddForm && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Categoria
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {categories.map(cat => {
                const isEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />

                      {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                          <input
                            type="text"
                            value={cat.name}
                            onChange={e => handleSaveEdit(cat.id, 'name', e.target.value)}
                            className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            placeholder="Nome"
                          />
                          <input
                            type="number"
                            min="1"
                            value={cat.maxCapacity}
                            onChange={e => handleSaveEdit(cat.id, 'maxCapacity', Number(e.target.value))}
                            className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                            placeholder="Vagas"
                          />
                          <input
                            type="text"
                            value={cat.price}
                            onChange={e => handleSaveEdit(cat.id, 'price', e.target.value)}
                            className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            placeholder="Preço"
                          />
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">{cat.name}</span>
                            <span className="text-[11px] font-mono text-cyan-400">{cat.price}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {cat.description}
                          </p>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            Inscritos: {cat.registeredCount} / {cat.maxCapacity} vagas
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 justify-end">
                      {isEditing ? (
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-xs font-medium flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Salvar
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingId(cat.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveCategory(cat.id, cat.name)}
                        className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                        title="Remover categoria do evento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Category Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddCategory}
              className="p-4 bg-slate-950/90 border border-cyan-500/40 rounded-xl space-y-3 animate-fade-in"
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-cyan-400">Criar Nova Categoria</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ex: Convidado Especial, Geral, etc."
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Limite de Vagas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCapacity}
                    onChange={e => setNewCapacity(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Valor / Condição
                  </label>
                  <input
                    type="text"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                    placeholder="Ex: Gratuito, R$ 150, etc."
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Cor da Categoria
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newColor}
                      onChange={e => setNewColor(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer p-0"
                    />
                    <span className="text-xs font-mono text-slate-400">{newColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Descrição / Benefícios
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Ex: Acesso livre ao evento e credenciamento facial"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-cyan-950"
                >
                  Salvar Nova Categoria
                </button>
              </div>
            </form>
          )}

          {/* Quick Notice */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-start gap-2 text-xs text-slate-400">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              O bloqueio automático de vagas encerra as inscrições da categoria no exato momento em que o total de inscritos atinge o limite configurado.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
