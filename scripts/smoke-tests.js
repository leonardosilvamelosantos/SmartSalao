#!/usr/bin/env node

/**
 * Smoke tests leves para validar servidor e endpoints básicos sem Jest
 */

const http = require('http');
const axios = require('axios');

async function run() {
  // Forçar ambiente de teste e desabilitar bot
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.START_WHATSAPP_BOT = 'false';

  const app = require('../src/index');

  const PORT = parseInt(process.env.SMOKE_PORT || '3101', 10);
  const HOST = '127.0.0.1';

  const server = http.createServer(app);

  function startServer() {
    return new Promise((resolve) => {
      server.listen(PORT, HOST, () => resolve());
    });
  }

  function stopServer() {
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  }

  const results = [];

  try {
    await startServer();

    const baseURL = `http://${HOST}:${PORT}`;

    // 1) Health
    try {
      const res = await axios.get(`${baseURL}/health`, { timeout: 8000 });
      results.push({ name: 'GET /health', status: res.status, ok: res.status === 200 });
    } catch (e) {
      results.push({ name: 'GET /health', error: e.message, ok: false });
    }

    // 2) DB Health
    try {
      const res = await axios.get(`${baseURL}/api/db-health`, { timeout: 8000 });
      results.push({ name: 'GET /api/db-health', status: res.status, ok: res.status === 200 });
    } catch (e) {
      results.push({ name: 'GET /api/db-health', error: e.message, ok: false });
    }

    // 3) Rota protegida sem auth
    try {
      await axios.get(`${baseURL}/api/usuarios`, { timeout: 8000 });
      results.push({ name: 'GET /api/usuarios (sem auth)', status: 200, ok: false });
    } catch (e) {
      const status = e.response?.status || 0;
      results.push({ name: 'GET /api/usuarios (sem auth)', status, ok: status === 401 });
    }

    // 4) Rota security básica (pode ser protegida)
    try {
      await axios.get(`${baseURL}/api/security/alerts`, { timeout: 8000 });
      results.push({ name: 'GET /api/security/alerts (sem auth)', status: 200, ok: false });
    } catch (e) {
      const status = e.response?.status || 0;
      results.push({ name: 'GET /api/security/alerts (sem auth)', status, ok: status === 401 || status === 403 });
    }

  } catch (error) {
    results.push({ name: 'startup', error: error.message, ok: false });
  } finally {
    await stopServer();
  }

  const summary = {
    passed: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results
  };

  console.log(JSON.stringify(summary, null, 2));

  process.exit(summary.failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


