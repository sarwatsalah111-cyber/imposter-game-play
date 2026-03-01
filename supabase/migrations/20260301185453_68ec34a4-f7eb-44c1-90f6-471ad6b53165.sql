
-- Add normalized_text column
ALTER TABLE public.word_bank ADD COLUMN IF NOT EXISTS normalized_text text;

-- Create normalization function
CREATE OR REPLACE FUNCTION public.normalize_word_text(input_text text, input_language text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  result := input_text;
  result := btrim(result);
  result := regexp_replace(result, '\s+', ' ', 'g');
  result := regexp_replace(result, E'[\\u200B\\u200C\\u200D\\uFEFF]', '', 'g');
  result := regexp_replace(result, '^[.,!?؟…:;\-–—]+', '', 'g');
  result := regexp_replace(result, '[.,!?؟…:;\-–—]+$', '', 'g');
  result := replace(result, E'\u201C', '"');
  result := replace(result, E'\u201D', '"');
  result := replace(result, E'\u2018', '''');
  result := replace(result, E'\u2019', '''');

  IF input_language = 'EN' THEN
    result := lower(result);
  END IF;

  IF input_language = 'AR' THEN
    result := replace(result, E'\u0640', '');
    result := replace(result, E'\u0623', E'\u0627');
    result := replace(result, E'\u0625', E'\u0627');
    result := replace(result, E'\u0622', E'\u0627');
    result := regexp_replace(result, E'[\\u064B-\\u065F\\u0670]', '', 'g');
  END IF;

  IF input_language IN ('KU_CENTRAL', 'KU_KURMANJI') THEN
    result := replace(result, E'\u0640', '');
    result := regexp_replace(result, E'[\\u200C\\u200D]', '', 'g');
  END IF;

  result := btrim(result);
  RETURN result;
END;
$$;

-- Populate normalized_text for existing words
UPDATE public.word_bank
SET normalized_text = public.normalize_word_text(word, language)
WHERE normalized_text IS NULL;

-- Delete duplicates keeping one per (language, normalized_text)
DELETE FROM public.word_bank a
USING public.word_bank b
WHERE a.language = b.language
  AND a.normalized_text = b.normalized_text
  AND a.id > b.id;

-- Make NOT NULL
ALTER TABLE public.word_bank ALTER COLUMN normalized_text SET NOT NULL;

-- Create unique index
CREATE UNIQUE INDEX idx_word_bank_language_normalized ON public.word_bank (language, normalized_text);

-- Auto-normalize trigger
CREATE OR REPLACE FUNCTION public.word_bank_normalize_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.normalized_text := public.normalize_word_text(NEW.word, NEW.language);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_word_bank_normalize
BEFORE INSERT OR UPDATE ON public.word_bank
FOR EACH ROW
EXECUTE FUNCTION public.word_bank_normalize_trigger();

-- RLS policies for full CRUD management
CREATE POLICY "Anyone can update words"
ON public.word_bank FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete words"
ON public.word_bank FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anyone can read active words" ON public.word_bank;
CREATE POLICY "Anyone can read words"
ON public.word_bank FOR SELECT USING (true);
