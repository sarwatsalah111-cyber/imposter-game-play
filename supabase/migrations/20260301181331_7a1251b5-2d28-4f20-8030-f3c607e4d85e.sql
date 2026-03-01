
-- Allow anyone to insert words into word_bank
CREATE POLICY "Anyone can insert words"
ON public.word_bank
FOR INSERT
WITH CHECK (true);
