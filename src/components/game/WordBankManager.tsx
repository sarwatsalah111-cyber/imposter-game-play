import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, type Language } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { X, Plus, Upload, Search, BookOpen, Loader2 } from 'lucide-react';
import { playClick } from '@/lib/sounds';

interface Word {
  id: string;
  word: string;
  category: string;
  language: string;
  difficulty: string;
}

const CATEGORIES = ['objects', 'food', 'animals', 'jobs', 'places', 'sports', 'nature', 'other'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

function AddWordForm({ language, uiLang, onAdded }: { language: string; uiLang: Language; onAdded: () => void }) {
  const [word, setWord] = useState('');
  const [category, setCategory] = useState('objects');
  const [difficulty, setDifficulty] = useState('medium');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!word.trim()) return;
    setAdding(true);
    const { error } = await supabase.from('word_bank').insert({
      word: word.trim(),
      category,
      difficulty,
      language,
    });
    setAdding(false);
    if (!error) {
      setWord('');
      onAdded();
    }
  };

  return (
    <div className="space-y-2 p-3 rounded-lg spooky-inner border border-border">
      <input
        type="text"
        placeholder={t('wordbank.wordPlaceholder', uiLang)}
        value={word}
        onChange={e => setWord(e.target.value)}
        maxLength={50}
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
    </div>
  );
}

function BulkImportForm({ language, uiLang, onImported }: { language: string; uiLang: Language; onImported: () => void }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('objects');
  const [difficulty, setDifficulty] = useState('medium');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleImport = async () => {
    const words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0 && w.length <= 50);
    if (words.length === 0) return;
    setImporting(true);
    setResult(null);

    const rows = words.map(w => ({
      word: w,
      category,
      difficulty,
      language,
    }));

    const { error, data } = await supabase.from('word_bank').insert(rows).select();
    setImporting(false);
    if (error) {
      setResult(`Error: ${error.message}`);
    } else {
      setResult(t('wordbank.importSuccess', uiLang, { count: data?.length || words.length }));
      setText('');
      onImported();
    }
  };

  return (
    <div className="space-y-2 p-3 rounded-lg spooky-inner border border-border">
      <p className="text-xs text-muted-foreground">{t('wordbank.bulkHint', uiLang)}</p>
      <textarea
        placeholder={t('wordbank.bulkPlaceholder', uiLang)}
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
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
        <p className={`text-xs text-center ${result.startsWith('Error') ? 'text-destructive' : 'text-accent'}`}>
          {result}
        </p>
      )}
    </div>
  );
}

export function WordBankModal({ language, uiLang, onClose }: { language: string; uiLang: Language; onClose: () => void }) {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'view' | 'add' | 'bulk'>('view');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [wordLang, setWordLang] = useState(language);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('word_bank').select('*').eq('language', wordLang).eq('is_active', true).order('category').limit(500);
    if (filterCat !== 'all') query = query.eq('category', filterCat);
    const { data } = await query;
    setWords((data as Word[]) || []);
    setLoading(false);
  }, [wordLang, filterCat]);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  const filtered = search ? words.filter(w => w.word.toLowerCase().includes(search.toLowerCase())) : words;

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md spooky-panel p-5 max-h-[85vh] flex flex-col"
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

        {/* Language filter for words */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {['EN', 'AR', 'KU_CENTRAL', 'KU_KURMANJI'].map(l => (
            <button
              key={l}
              onClick={() => { playClick(); setWordLang(l); }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all uppercase tracking-wider ${
                wordLang === l ? 'spooky-btn-gold' : 'spooky-inner border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {l === 'EN' ? 'EN' : l === 'AR' ? 'AR' : l === 'KU_CENTRAL' ? 'KU' : 'KR'}
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
                      className="w-full pl-8 pr-3 py-1.5 spooky-input text-xs"
                    />
                  </div>
                  <select
                    value={filterCat}
                    onChange={e => { setFilterCat(e.target.value); }}
                    className="px-2 py-1.5 rounded-lg spooky-inner border border-border text-xs text-foreground bg-transparent"
                  >
                    <option value="all">{t('wordbank.allCategories', uiLang)}</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{t(`wordbank.cat.${c}`, uiLang)}</option>
                    ))}
                  </select>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">{t('wordbank.noWords', uiLang)}</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('wordbank.wordCount', uiLang, { count: filtered.length })}</p>
                    <div className="grid grid-cols-2 gap-1.5 max-h-[40vh] overflow-y-auto pr-1">
                      {filtered.map(w => (
                        <div key={w.id} className="px-2.5 py-1.5 rounded-lg spooky-inner border border-border text-xs">
                          <span className="text-foreground font-medium">{w.word}</span>
                          <span className="text-muted-foreground/60 ml-1">· {w.category}</span>
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
    </motion.div>
  );
}
