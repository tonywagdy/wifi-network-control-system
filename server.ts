import express, { Request, Response } from 'express';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { createServer as createViteServer } from 'vite';
import net from 'net';

const app = express();
const PORT = 3000;
const PYTHON_API_URL = 'http://127.0.0.1:5000';

let pythonProcess: ChildProcess | null = null;

// Function to safely spin up the Python background services & REST API
function startPythonBackend() {
  console.log('[Express Master] Launching Python API Server daemon & telemetry worker loops...');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const backendScript = path.join(process.cwd(), 'backend', 'api_server.py');

  pythonProcess = spawn(pythonCmd, [backendScript], {
    stdio: 'pipe',
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });

  pythonProcess.stdout?.on('data', (data) => {
    console.log(`[Python Stdout] ${data.toString().trim()}`);
  });

  pythonProcess.stderr?.on('data', (data) => {
    console.error(`[Python Stderr] ${data.toString().trim()}`);
  });

  pythonProcess.on('close', (code) => {
    console.warn(`[Express Master] Python process exited with code ${code}. Re-spawning in 5 seconds...`);
    pythonProcess = null;
    setTimeout(startPythonBackend, 5000);
  });
}

// Start python daemon on startup
startPythonBackend();

// Middleware inside Node
app.use(express.json());

// Proxy router forwarding requests from express to Python REST endpoints
app.all('/api/*', async (req: Request, res: Response) => {
  const targetUrl = `${PYTHON_API_URL}${req.originalUrl}`;
  try {
    const headers: { [key: string]: string } = {};
    for (const [key, val] of Object.entries(req.headers)) {
      if (typeof val === 'string') {
        headers[key] = val;
      }
    }
    // Set host correctly for proxy loops
    headers['host'] = '127.0.0.1:5000';

    const cleanBody = ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body);

    const apiResponse = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: cleanBody
    });

    const data = await apiResponse.json();
    res.status(apiResponse.status).json(data);
  } catch (error: any) {
    if (error.message && error.message.includes('fetch failed')) {
      // Suppress noisy startup errors when Python daemon is still booting
    } else {
      console.error(`[API Proxy Error] Failed parsing request to ${targetUrl}:`, error.message);
    }
    res.status(503).json({
      error: 'Service Unavailable - Python Core not ready yet',
      details: error.message
    });
  }
});

// Setup Vite Dev server vs static serve production
async function setupFrontendMiddleware() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Static distribution serve
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupFrontendMiddleware().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Express Master] Fullstack application running on http://localhost:${PORT}`);
  });

  // Zero-dependency native TCP proxy for WebSocket upgrades on /api/ws (to bypass Port constraints)
  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname === '/api/ws' || pathname === '/api/events') {
      const targetSocket = net.connect(5001, '127.0.0.1', () => {
        let rawRequest = `${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`;
        for (const [key, val] of Object.entries(request.headers)) {
          if (Array.isArray(val)) {
            val.forEach(v => rawRequest += `${key}: ${v}\r\n`);
          } else {
            rawRequest += `${key}: ${val}\r\n`;
          }
        }
        rawRequest += '\r\n';
        targetSocket.write(rawRequest);
        if (head && head.length > 0) {
          targetSocket.write(head);
        }
      });

      socket.pipe(targetSocket);
      targetSocket.pipe(socket);

      socket.on('error', () => targetSocket.destroy());
      targetSocket.on('error', () => socket.destroy());
    } else {
      socket.destroy();
    }
  });
});

// Complete process teardowns safely
process.on('SIGINT', () => {
  console.log('[Express Master] Received SIGINT. Dismantling processes...');
  if (pythonProcess) {
    pythonProcess.kill();
  }
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('[Express Master] Received SIGTERM. Dismantling processes...');
  if (pythonProcess) {
    pythonProcess.kill();
  }
  process.exit();
});
