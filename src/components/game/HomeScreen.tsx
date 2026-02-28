import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t, LANGUAGES, type Language } from '@/lib/i18n';
import { Eye, Users, Globe, Sparkles, Skull } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 safe-area-top safe-area-bottom relative">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-vignette" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[120px]" />
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
          <div className="flex items-center justify-center gap-3 mb-3">
            <Skull className="w-9 h-9 text-primary" />
            <Eye className="w-6 h-6 text-accent animate-pulse" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground text-glow-purple tracking-wide uppercase">
            {t('app.title', language)}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm italic">
            {t('app.subtitle', language)}
          </p>
        </motion.div>

        {/* Language selector */}
        <div className="flex gap-2 flex-wrap justify-center">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all uppercase tracking-wider ${
                language === lang.code
                  ? 'spooky-btn-gold'
                  : 'spooky-inner border border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Main panel */}
        <div className="w-full spooky-panel spider-corner p-5 scratched-texture">
          {/* Nickname input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder={t('home.nickname', language)}
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-3 spooky-input text-center font-semibold"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm text-center cursor-pointer"
              onClick={clearError}
            >
              {error}
            </motion.div>
          )}

          {mode === 'home' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-3"
            >
              <button
                onClick={() => nickname.trim() ? setMode('create') : undefined}
                disabled={!nickname.trim()}
                className="w-full py-4 spooky-btn text-base flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                {t('home.create', language)}
              </button>
              <button
                onClick={() => nickname.trim() ? setMode('join') : undefined}
                disabled={!nickname.trim()}
                className="w-full py-4 spooky-btn-gold spooky-btn text-base flex items-center justify-center gap-2"
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
              className="flex flex-col gap-3"
            >
              <button
                onClick={handleCreate}
                disabled={loading || !nickname.trim()}
                className="w-full py-4 spooky-btn text-base glow-purple"
              >
                {loading ? '...' : t('home.create', language)}
              </button>
              <button
                onClick={() => setMode('home')}
                className="text-muted-foreground text-sm hover:text-foreground transition-colors font-display uppercase tracking-wider"
              >
                ← {t('lobby.leave', language)}
              </button>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                inputMode="numeric"
                placeholder={t('home.enterCode', language)}
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="w-full px-4 py-3 spooky-input text-center font-display text-2xl tracking-[0.5em]"
              />
              <button
                onClick={handleJoin}
                disabled={loading || roomCode.length !== 6}
                className="w-full py-4 spooky-btn text-base glow-purple"
              >
                {loading ? '...' : t('home.join', language)}
              </button>
              <button
                onClick={() => { setMode('home'); setRoomCode(''); }}
                className="text-muted-foreground text-sm hover:text-foreground transition-colors font-display uppercase tracking-wider"
              >
                ← {t('lobby.leave', language)}
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
