// netlify/functions/sync.mjs
// Sync de dados via Netlify Blobs — mesmo domínio, zero CORS
// Gratuito no plano Starter do Netlify

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'bi-saldos';

export default async (req, context) => {
  // CORS headers — permite chamadas do mesmo site
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers });
  }

  const store = getStore(STORE_NAME);

  // ── GET /api/sync?key=xxx → carregar dados ──
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return new Response(JSON.stringify({ error: 'key required' }), { status: 400, headers });
    }
    try {
      const data = await store.get(key, { type: 'json' });
      if (!data) {
        return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers });
      }
      return new Response(JSON.stringify(data), { status: 200, headers });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
  }

  // ── POST /api/sync → salvar dados ──
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      // Usar key existente ou gerar nova (timestamp + random)
      const key = body.key && body.key.length > 8
        ? body.key
        : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

      // Remover o campo key do payload antes de salvar
      const { key: _k, ...payload } = body;
      await store.setJSON(key, payload);

      return new Response(JSON.stringify({ key, ok: true }), { status: 200, headers });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers });
};

export const config = {
  path: '/api/sync',
};
