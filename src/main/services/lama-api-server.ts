/**
 * LAMA HTTP API Server
 *
 * Exposes LAMA functionality via REST API using refinio.api patterns.
 * Routes: POST /api/:handler/:method
 */

import http from 'http';
import { getPlanRegistry } from './mcp-server-init.js';

export class LamaAPIServer {
  private server: http.Server | null = null;
  private port: number;
  private requestCount = 0;
  private startTime: number | null = null;

  constructor(port: number = 8787) {
    this.port = port;
  }

  getStatus() {
    const registry = getPlanRegistry();
    return {
      running: this.server !== null,
      port: this.port,
      requestCount: this.requestCount,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      url: `http://127.0.0.1:${this.port}`,
      plans: registry?.listPlans() || []
    };
  }

  async start() {
    if (this.server) {
      console.log('[LamaAPI] Server already running');
      return;
    }

    this.startTime = Date.now();

    this.server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = req.url || '/';

      // GET /health
      if (req.method === 'GET' && url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', ...this.getStatus() }));
        return;
      }

      // GET /api - list handlers
      if (req.method === 'GET' && url === '/api') {
        const registry = getPlanRegistry();
        if (!registry) {
          res.writeHead(503);
          res.end(JSON.stringify({ success: false, error: 'Registry not initialized' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          handlers: registry.getAllMetadata()
        }));
        return;
      }

      // POST /api/:handler/:method
      if (req.method === 'POST' && url.startsWith('/api/')) {
        const parts = url.slice(5).split('/'); // Remove '/api/'
        if (parts.length !== 2) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid path. Use /api/:handler/:method' }));
          return;
        }

        const [handler, method] = parts;

        // Parse request body
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const params = body ? JSON.parse(body) : {};

            this.requestCount++;
            console.log(`[LamaAPI] ${this.requestCount}. ${handler}/${method}`, Object.keys(params).length > 0 ? `(${Object.keys(params).join(', ')})` : '');

            const registry = getPlanRegistry();
            if (!registry) {
              res.writeHead(503);
              res.end(JSON.stringify({ success: false, error: { code: 'REGISTRY_NOT_INITIALIZED', message: 'Registry not initialized' } }));
              return;
            }

            const result = await registry.call(handler, method, params);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));

          } catch (error) {
            console.error('[LamaAPI] Request error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({
              success: false,
              error: { code: 'INTERNAL_ERROR', message: (error as Error).message }
            }));
          }
        });
        return;
      }

      // Not found
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: 'Not found. Use GET /health, GET /api, or POST /api/:handler/:method' }));
    });

    return new Promise<void>((resolve, reject) => {
      this.server!.listen(this.port, '127.0.0.1', () => {
        console.log(`[LamaAPI] ✅ HTTP API server listening on http://127.0.0.1:${this.port}`);
        console.log(`[LamaAPI] 📡 Endpoints: GET /health, GET /api, POST /api/:handler/:method`);
        resolve();
      });

      this.server!.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`[LamaAPI] Port ${this.port} already in use - API server already running`);
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server!.close(() => {
          console.log(`[LamaAPI] ⏹️  Server stopped (${this.requestCount} requests served)`);
          this.server = null;
          this.startTime = null;
          resolve();
        });
      });
    }
  }
}

// Singleton instance
export const lamaAPIServer = new LamaAPIServer();
