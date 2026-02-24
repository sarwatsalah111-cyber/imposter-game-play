import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t, LANGUAGES, type Language } from '@/lib/i18n';
import { Eye, Users, Globe, Sparkles } from 'lucide-react';

export function HomeScreen() {
  const { nickname, setNickname, language, setLanguage, createRoom, joinRoom, loading, error, clearError } = useGame();
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [roomCode, setRoomCode] = useState('');

  const handleCreate = async () => {
    if (!nickname.trim()) return;
    await createRoom();
  };

  const handleJoin = async () => {
    if (!nickname.trim() || roomCode.length !== 6) return;
    await joinRoom(roomCode);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 safe-area-top safe-area-bottom">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Eye className="w-8 h-8 text-primary" />
            <Sparkles className="w-5 h-5 text-accent animate-pulse-glow" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground text-glow-green tracking-tight">
            {t('app.title', language)}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('app.subtitle', language)}
          </p>
        </motion.div>

        {/* Language selector */}
        <div className="flex gap-2 flex-wrap justify-center">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                language === lang.code
                  ? 'bg-primary text-primary-foreground glow-green'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Nickname input */}
        <div className="w-full">
          <input
            type="text"
            placeholder={t('home.nickname', language)}
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={20}
            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-center font-medium transition-all"
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center"
            onClick={clearError}
          >
            {error}
          </motion.div>
        )}

        {mode === 'home' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full flex flex-col gap-3"
          >
            <button
              onClick={() => nickname.trim() ? setMode('create') : undefined}
              disabled={!nickname.trim()}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg glow-green hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              {t('home.create', language)}
            </button>
            <button
              onClick={() => nickname.trim() ? setMode('join') : undefined}
              disabled={!nickname.trim()}
              className="w-full py-4 rounded-xl bg-secondary text-secondary-foreground font-display font-bold text-lg border border-border hover:bg-secondary/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Globe className="w-5 h-5" />
              {t('home.join', language)}
            </button>
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-3"
          >
            <button
              onClick={handleCreate}
              disabled={loading || !nickname.trim()}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg glow-green hover:opacity-90 transition-all disabled:opacity-60"
            >
              {loading ? '...' : t('home.create', language)}
            </button>
            <button
              onClick={() => setMode('home')}
              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              ← {t('lobby.leave', language)}
            </button>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-3"
          >
            <input
              type="text"
              inputMode="numeric"
              placeholder={t('home.enterCode', language)}
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-center font-display text-2xl tracking-[0.5em] transition-all"
            />
            <button
              onClick={handleJoin}
              disabled={loading || roomCode.length !== 6}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg glow-green hover:opacity-90 transition-all disabled:opacity-60"
            >
              {loading ? '...' : t('home.join', language)}
            </button>
            <button
              onClick={() => { setMode('home'); setRoomCode(''); }}
              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              ← {t('lobby.leave', language)}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
