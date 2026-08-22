const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Setup WebSocket Server for Sentinel Agent
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname, query } = parse(request.url, true);
    
    if (pathname === '/agent') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, query.projectId);
      });
    } else {
      socket.destroy();
    }
  });

  const activeAgents = new Map(); // projectId -> ws

  wss.on('connection', async (ws, request, projectId) => {
    if (!projectId) {
      ws.close(1008, 'Project ID required');
      return;
    }

    console.log(`Agent connected for project: ${projectId}`);
    activeAgents.set(projectId, ws);

    // Create session in DB
    const session = await prisma.agentSession.create({
      data: {
        projectId,
        status: 'CONNECTED',
      }
    });

    ws.on('message', async (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'agent_connected') {
        console.log(`Agent initialized for ${message.projectId}`);
      } else if (message.type === 'capability_response') {
        console.log(`Capability response received:`, message);
        // Save permission request result
        await prisma.permissionRequest.update({
          where: { id: message.requestId },
          data: {
            status: message.status,
            result: message.result ? JSON.stringify(message.result) : null,
          }
        });
      } else if (message.type === 'telemetry') {
        // Save telemetry
        await prisma.telemetryEvent.create({
          data: {
            sessionId: session.id,
            type: message.event_type,
            content: JSON.stringify(message.data)
          }
        });
      }
    });

    ws.on('close', async () => {
      console.log(`Agent disconnected for project: ${projectId}`);
      activeAgents.delete(projectId);
      await prisma.agentSession.update({
        where: { id: session.id },
        data: {
          status: 'DISCONNECTED',
          endedAt: new Date()
        }
      });
    });
  });

  // Attach a way for API routes to access active agents
  global.activeAgents = activeAgents;

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
