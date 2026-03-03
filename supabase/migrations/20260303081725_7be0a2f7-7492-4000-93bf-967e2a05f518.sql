
-- Add translations JSONB column to word_bank
ALTER TABLE public.word_bank ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';
