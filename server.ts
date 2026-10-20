import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOrJlqr_-rkEfKEGWI6IdX-sBbOc9ZE12Bn7NcWXcc13rKBmaBugAxFMqchuU17McomYpvZAkD3-ry/pub?gid=1786232658&single=true&output=csv';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Proxy endpoint to fetch Google Sheets CSV server-side avoiding CORS
  app.get('/api/sheet-csv', async (_req, res) => {
    try {
      const response = await fetch(SHEET_CSV_URL);
      if (!response.ok) {
        return res.status(response.status).send('Erro ao buscar planilha no Google Sheets');
      }
      const text = await response.text();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send(text);
    } catch (err: any) {
      console.error('Error fetching sheet CSV:', err);
      res.status(500).send(err?.message || 'Erro interno ao buscar planilha');
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
