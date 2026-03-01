import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, type Language } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { X, Plus, Upload, Search, BookOpen, Loader2, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { playClick } from '@/lib/sounds';

interface Word {
  id: string;
  word: string;
  category: string;
  language: string;
  difficulty: string;
  is_active: boolean;
  normalized_text: string;
}

const CATEGORIES = ['objects', 'food', 'animals', 'jobs', 'places', 'sports', 'nature', 'other'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

async function callWordBank<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('word-bank-manager', {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || 'Word bank error');
  if (data?.error) throw new Error(data.error);
  return data as T;
}

function AddWordForm({ language, uiLang, onAdded }: { language: string; uiLang: Language; onAdded: () => void }) {
  const [word, setWord] = useState('');
  const [category, setCategory] = useState('objects');
  const [difficulty, setDifficulty] = useState('medium');
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'duplicate' | 'error'; msg: string } | null>(null);
  const isRtl = language === 'AR' || language === 'KU_CENTRAL';

  const handleAdd = async () => {
    if (!word.trim()) return;
    setAdding(true);
    setResult(null);
    try {
      const res = await callWordBank<{ status: string; word?: unknown }>('add-word', {
        language, word: word.trim(), category, difficulty,
      });
      if (res.status === 'IGNORED_DUPLICATE') {
        setResult({ type: 'duplicate', msg: t('wordbank.duplicate', uiLang) });
      } else {
        setResult({ type: 'success', msg: t('wordbank.wordAdded', uiLang) });
        setWord('');
        onAdded();
      }
    } catch (e: unknown) {
      setResult({ type: 'error', msg: (e as Error).message });
    }
    setAdding(false);
  };

  return (
    <div className="space-y-2 p-3 rounded-lg spooky-inner border border-border">
      <input
        type="text"
        placeholder={t('wordbank.wordPlaceholder', uiLang)}
        value={word}
        onChange={e => setWord(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        maxLength={50}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="w-full px-3 py-2 spooky-input text-sm"
      />
      <div className="flex gap-2">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-lg spooky-inner border border-border text-xs text-foreground bg-transparent"
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{t(`wordbank.cat.${c}`, uiLang)}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-lg spooky-inner border border-border text-xs text-foreground bg-transparent"
        >
          {DIFFICULTIES.map(d => (
            <option key={d} value={d}>{t(`wordbank.diff.${d}`, uiLang)}</option>
          ))}
        </select>
      </div>
      <button
        onClick={() => { playClick(); handleAdd(); }}
        disabled={adding || !word.trim()}
        className="w-full py-2 spooky-btn text-xs flex items-center justify-center gap-1"
      >
        {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        {t('wordbank.addWord', uiLang)}
      </button>
      {result && (
        <p className={`text-xs text-center ${
          result.type === 'success' ? 'text-accent' :
          result.type === 'duplicate' ? 'text-primary' : 'text-destructive'
        }`}>
          {result.msg}
        </p>
      )}
    </div>
  );
}

function BulkImportForm({ language, uiLang, onImported }: { language: string; uiLang: Language; onImported: () => void }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('objects');
  const [difficulty, setDifficulty] = useState('medium');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ addedCount: number; duplicateCount: number; invalidCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isRtl = language === 'AR' || language === 'KU_CENTRAL';

  const handleImport = async () => {
    const lines = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
    if (lines.length === 0) return;
    setImporting(true);
    setResult(null);
    setError(null);

    try {
      const res = await callWordBank<{ addedCount: number; duplicateCount: number; invalidCount: number }>(
        'bulk-add', { language, lines, category, difficulty }
      );
      setResult(res);
      if (res.addedCount > 0) {
        setText('');
        onImported();
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setImporting(false);
  };

  return (
    <div className="space-y-2 p-3 rounded-lg spooky-inner border border-border">
      <p className="text-xs text-muted-foreground">{t('wordbank.bulkHint', uiLang)}</p>
      <textarea
        placeholder={t('wordbank.bulkPlaceholder', uiLang)}
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="w-full px-3 py-2 spooky-input text-sm resize-none"
      />
      <div className="flex gap-2">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-lg spooky-inner border border-border text-xs text-foreground bg-transparent"
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{t(`wordbank.cat.${c}`, uiLang)}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-lg spooky-inner border border-border text-xs text-foreground bg-transparent"
        >
          {DIFFICULTIES.map(d => (
            <option key={d} value={d}>{t(`wordbank.diff.${d}`, uiLang)}</option>
          ))}
        </select>
      </div>
      <button
        onClick={() => { playClick(); handleImport(); }}
        disabled={importing || !text.trim()}
        className="w-full py-2 spooky-btn-gold spooky-btn text-xs flex items-center justify-center gap-1"
      >
        {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        {t('wordbank.import', uiLang)}
      </button>
      {result && (
        <div className="text-xs space-y-0.5 p-2 rounded-lg bg-accent/10 border border-accent/20">
          <p className="text-accent font-semibold">✓ {t('wordbank.importSuccess', uiLang, { count: result.addedCount })}</p>
          {result.duplicateCount > 0 && (
            <p className="text-muted-foreground">↳ {result.duplicateCount} duplicates ignored</p>
          )}
          {result.invalidCount > 0 && (
            <p className="text-muted-foreground">↳ {result.invalidCount} invalid entries skipped</p>
          )}
        </div>
      )}
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}

function ConfirmDeleteModal({ word, uiLang, onConfirm, onCancel }: {
  word: Word; uiLang: Language; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xs spooky-panel p-5 text-center space-y-3"
      >
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
        <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider">
          Delete permanently?
        </h3>
        <p className="text-muted-foreground text-xs">
          "{word.word}" will be removed. Consider deactivating instead to preserve game history.
        </p>
        <div className="flex gap-2">
          <button onClick={() => { playClick(); onCancel(); }} className="flex-1 py-2 spooky-btn text-xs">
            Cancel
          </button>
          <button onClick={() => { playClick(); onConfirm(); }} className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/80 transition-colors">
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function WordBankModal({ language, uiLang, onClose }: { language: string; uiLang: Language; onClose: () => void }) {
  const [words, setWords] = useState<Word[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'view' | 'add' | 'bulk'>('view');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [wordLang, setWordLang] = useState(language);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Word | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isRtl = wordLang === 'AR' || wordLang === 'KU_CENTRAL';

  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callWordBank<{ words: Word[]; total: number }>('list-words', {
        language: wordLang,
        category: filterCat !== 'all' ? filterCat : undefined,
        query: search || undefined,
        show_inactive: showInactive,
        limit: 500,
      });
      setWords(res.words);
      setTotal(res.total);
    } catch {
      setWords([]);
    }
    setLoading(false);
  }, [wordLang, filterCat, search, showInactive]);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  const handleToggleActive = async (word: Word) => {
    setActionLoading(word.id);
    try {
      await callWordBank('toggle-active', { id: word.id, is_active: !word.is_active });
      setWords(prev => prev.map(w => w.id === word.id ? { ...w, is_active: !w.is_active } : w));
    } catch {}
    setActionLoading(null);
  };

  const handleDelete = async (word: Word) => {
    setActionLoading(word.id);
    try {
      await callWordBank('delete-word', { id: word.id });
      setWords(prev => prev.filter(w => w.id !== word.id));
      setTotal(prev => prev - 1);
    } catch {}
    setActionLoading(null);
    setDeleteTarget(null);
  };

  const tabs = [
    { id: 'view' as const, label: t('wordbank.tabView', uiLang), icon: BookOpen },
    { id: 'add' as const, label: t('wordbank.tabAdd', uiLang), icon: Plus },
    { id: 'bulk' as const, label: t('wordbank.tabBulk', uiLang), icon: Upload },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md spooky-panel p-4 sm:p-5 max-h-[95vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-foreground text-lg uppercase tracking-wider text-glow-purple flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {t('wordbank.title', uiLang)}
          </h2>
          <button onClick={() => { playClick(); onClose(); }} className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language tabs */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {[
            { code: 'EN', label: 'EN' },
            { code: 'AR', label: 'AR' },
            { code: 'KU_CENTRAL', label: 'KU' },
            { code: 'KU_KURMANJI', label: 'KR' },
          ].map(l => (
            <button
              key={l.code}
              onClick={() => { playClick(); setWordLang(l.code); setSearch(''); }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all uppercase tracking-wider ${
                wordLang === l.code ? 'spooky-btn-gold' : 'spooky-inner border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3">
          {tabs.map(tb => (
            <button
              key={tb.id}
              onClick={() => { playClick(); setTab(tb.id); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                tab === tb.id ? 'spooky-btn-gold' : 'spooky-inner border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <tb.icon className="w-3 h-3" />
              {tb.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {tab === 'view' && (
              <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t('wordbank.search', uiLang)}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      dir={isRtl ? 'rtl' : 'ltr'}
                      className="w-full pl-8 pr-3 py-1.5 spooky-input text-xs"
                    />
                  </div>
                  <select
                    value={filterCat}
                    onChange={e => setFilterCat(e.target.value)}
                    className="px-2 py-1.5 rounded-lg spooky-inner border border-border text-xs text-foreground bg-transparent"
                  >
                    <option value="all">{t('wordbank.allCategories', uiLang)}</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{t(`wordbank.cat.${c}`, uiLang)}</option>
                    ))}
                  </select>
                </div>

                {/* Show inactive toggle */}
                <button
                  onClick={() => { playClick(); setShowInactive(!showInactive); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showInactive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {showInactive ? 'Showing all (incl. inactive)' : 'Showing active only'}
                </button>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : words.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">{t('wordbank.noWords', uiLang)}</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('wordbank.wordCount', uiLang, { count: total })}</p>
                    <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-1" dir={isRtl ? 'rtl' : 'ltr'}>
                      {words.map(w => (
                        <div
                          key={w.id}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg spooky-inner border text-xs transition-all ${
                            w.is_active ? 'border-border' : 'border-destructive/20 opacity-60'
                          }`}
                        >
                          <span className={`flex-1 min-w-0 truncate font-medium ${w.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                            {w.word}
                          </span>

                          {/* Toggle active */}
                          <button
                            onClick={() => { playClick(); handleToggleActive(w); }}
                            disabled={actionLoading === w.id}
                            className={`shrink-0 w-7 h-7 flex items-center justify-center rounded transition-colors ${
                              w.is_active
                                ? 'text-accent hover:text-accent/70'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title={w.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {actionLoading === w.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : w.is_active ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => { playClick(); setDeleteTarget(w); }}
                            disabled={actionLoading === w.id}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'add' && (
              <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AddWordForm language={wordLang} uiLang={uiLang} onAdded={fetchWords} />
              </motion.div>
            )}

            {tab === 'bulk' && (
              <motion.div key="bulk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <BulkImportForm language={wordLang} uiLang={uiLang} onImported={fetchWords} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDeleteModal
            word={deleteTarget}
            uiLang={uiLang}
            onConfirm={() => handleDelete(deleteTarget)}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
