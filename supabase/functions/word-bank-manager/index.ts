import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeWord(text: string, language: string): string {
  let result = text.trim().replace(/\s+/g, ' ');
  // Remove zero-width characters
  result = result.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  // Remove surrounding punctuation
  result = result.replace(/^[.,!?؟…:;\-–—]+/, '').replace(/[.,!?؟…:;\-–—]+$/, '');
  // Fancy quotes
  result = result.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  if (language === 'EN') {
    result = result.toLowerCase();
  }
  if (language === 'AR') {
    result = result.replace(/\u0640/g, ''); // tatweel
    result = result.replace(/[\u0623\u0625\u0622]/g, '\u0627'); // alef variants
    result = result.replace(/[\u064B-\u065F\u0670]/g, ''); // harakat
  }
  if (language === 'KU_CENTRAL' || language === 'KU_KURMANJI') {
    result = result.replace(/\u0640/g, '');
    result = result.replace(/[\u200C\u200D]/g, '');
  }
  return result.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case 'add-word': {
        const { language, word, category = 'other', difficulty = 'medium' } = params;
        if (!language || !word?.trim()) return json({ error: 'Missing language or word' }, 400);
        const trimmed = word.trim().slice(0, 50);
        const normalized = normalizeWord(trimmed, language);
        if (!normalized) return json({ error: 'Invalid word' }, 400);

        // Check for duplicate
        const { data: existing } = await supabase
          .from('word_bank').select('id')
          .eq('language', language).eq('normalized_text', normalized).maybeSingle();
        if (existing) {
          return json({ status: 'IGNORED_DUPLICATE', word: trimmed });
        }

        const { data, error } = await supabase.from('word_bank').insert({
          word: trimmed, language, category, difficulty, normalized_text: normalized,
        }).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ status: 'ADDED', word: data });
      }

      case 'bulk-add': {
        const { language, lines, category = 'other', difficulty = 'medium' } = params;
        if (!language || !Array.isArray(lines)) return json({ error: 'Missing fields' }, 400);

        const processed = lines
          .map((l: string) => l?.trim().slice(0, 50))
          .filter((l: string) => l && l.length > 0);

        if (processed.length === 0) return json({ addedCount: 0, duplicateCount: 0, invalidCount: lines.length });

        // Normalize and dedupe within batch
        const seen = new Set<string>();
        const unique: { word: string; normalized: string }[] = [];
        let invalidCount = 0;
        for (const w of processed) {
          const norm = normalizeWord(w, language);
          if (!norm || norm.length === 0) { invalidCount++; continue; }
          if (seen.has(norm)) continue;
          seen.add(norm);
          unique.push({ word: w, normalized: norm });
        }

        // Check existing in DB
        const normalizedList = unique.map(u => u.normalized);
        const { data: existing } = await supabase
          .from('word_bank').select('normalized_text')
          .eq('language', language).in('normalized_text', normalizedList);
        const existingSet = new Set((existing || []).map(e => e.normalized_text));

        const toInsert = unique
          .filter(u => !existingSet.has(u.normalized))
          .map(u => ({
            word: u.word, language, category, difficulty, normalized_text: u.normalized,
          }));

        const duplicateCount = unique.length - toInsert.length;

        if (toInsert.length === 0) {
          return json({ addedCount: 0, duplicateCount, invalidCount });
        }

        // Batch insert (chunks of 100)
        let addedCount = 0;
        for (let i = 0; i < toInsert.length; i += 100) {
          const chunk = toInsert.slice(i, i + 100);
          const { data, error } = await supabase.from('word_bank').insert(chunk).select();
          if (!error && data) addedCount += data.length;
        }

        return json({ addedCount, duplicateCount, invalidCount });
      }

      case 'update-word': {
        const { id, word, category, difficulty, is_active } = params;
        if (!id) return json({ error: 'Missing id' }, 400);

        const updates: Record<string, unknown> = {};
        if (word !== undefined) {
          const trimmed = word.trim().slice(0, 50);
          updates.word = trimmed;
          // normalized_text will be computed by trigger
        }
        if (category !== undefined) updates.category = category;
        if (difficulty !== undefined) updates.difficulty = difficulty;
        if (is_active !== undefined) updates.is_active = is_active;

        const { error } = await supabase.from('word_bank').update(updates).eq('id', id);
        if (error) {
          if (error.message.includes('duplicate') || error.message.includes('unique')) {
            return json({ error: 'A word with this text already exists' }, 409);
          }
          return json({ error: error.message }, 500);
        }
        return json({ success: true });
      }

      case 'toggle-active': {
        const { id, is_active } = params;
        if (!id || is_active === undefined) return json({ error: 'Missing fields' }, 400);
        const { error } = await supabase.from('word_bank').update({ is_active }).eq('id', id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      case 'delete-word': {
        const { id } = params;
        if (!id) return json({ error: 'Missing id' }, 400);
        const { error } = await supabase.from('word_bank').delete().eq('id', id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      case 'list-words': {
        const { language, query, category, show_inactive, page = 0, limit = 200 } = params;
        if (!language) return json({ error: 'Missing language' }, 400);

        let q = supabase.from('word_bank').select('*', { count: 'exact' })
          .eq('language', language)
          .order('word')
          .range(page * limit, (page + 1) * limit - 1);

        if (!show_inactive) q = q.eq('is_active', true);
        if (category && category !== 'all') q = q.eq('category', category);
        if (query) q = q.ilike('word', `%${query}%`);

        const { data, count, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ words: data || [], total: count || 0 });
      }

      case 'word-count': {
        const { language } = params;
        if (!language) return json({ error: 'Missing language' }, 400);
        const { count } = await supabase
          .from('word_bank').select('*', { count: 'exact', head: true })
          .eq('language', language).eq('is_active', true);
        return json({ count: count || 0 });
      }

      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    console.error('Word bank manager error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
