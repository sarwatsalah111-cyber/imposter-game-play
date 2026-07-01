// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { session_id, room_id, word } = await req.json();
    if (!session_id || !room_id || !word) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify caller is a non-imposter in that room and the word matches
    const { data: room } = await supabase
      .from('rooms').select('secret_word, imposter_session_id')
      .eq('id', room_id).single();
    if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404, headers: corsHeaders });
    if (room.imposter_session_id === session_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }
    if (!room.secret_word || String(word).trim().toLowerCase() !== String(room.secret_word).trim().toLowerCase()) {
      // Only allow generating for the current secret word
      return new Response(JSON.stringify({ error: 'Word mismatch' }), { status: 400, headers: corsHeaders });
    }

    // Verify player is in the room
    const { data: player } = await supabase
      .from('room_players').select('id')
      .eq('room_id', room_id).eq('session_id', session_id).maybeSingle();
    if (!player) return new Response(JSON.stringify({ error: 'Not in room' }), { status: 403, headers: corsHeaders });

    const prompt = `A clear, family-friendly illustration of: ${room.secret_word}. Simple centered subject, soft painterly style, no text, no letters, no captions.`;

    const upstream = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-image-1-mini',
        prompt,
        size: '1024x1024',
        quality: 'low',
        n: 1,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(JSON.stringify({ error: `Image gen failed: ${errText.slice(0, 200)}` }), {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: any = await upstream.json();
    const b64 = payload?.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(JSON.stringify({ error: 'No image returned' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ image: `data:image/png;base64,${b64}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});