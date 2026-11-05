// Build script to synchronize application static assets into worker.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appDir = path.join(__dirname, 'application');
const html = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(appDir, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(appDir, 'script.js'), 'utf8');

const workerPath = path.join(appDir, 'worker.js');

const workerTemplate = `/**
 * Student Task Management Application - Cloudflare Worker
 * Fully serverless REST API & Web Interface powered by Workers KV
 * Managed via Terraform IaC
 */

// Embedded Frontend Assets for standalone Worker deployment
const HTML_CONTENT = ${JSON.stringify(html)};
const CSS_CONTENT = ${JSON.stringify(css)};
const JS_CONTENT = ${JSON.stringify(js)};

// Standard CORS Headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Response helper
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS
    }
  });
}

function textResponse(content, contentType, status = 200) {
  return new Response(content, {
    status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300',
      ...CORS_HEADERS
    }
  });
}

// Generate sequential academic task ID (e.g., T101, T102, T103...)
function generateTaskId(existingIds) {
  let maxNum = 100;
  for (const id of existingIds) {
    const match = id.match(/^T(\\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return \`T\${maxNum + 1}\`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    // Static Assets & Web Interface
    if (pathname === '/' || pathname === '/index.html') {
      return textResponse(HTML_CONTENT, 'text/html; charset=utf-8');
    }
    if (pathname === '/style.css') {
      return textResponse(CSS_CONTENT, 'text/css; charset=utf-8');
    }
    if (pathname === '/script.js') {
      return textResponse(JS_CONTENT, 'application/javascript; charset=utf-8');
    }
    if (pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    // Diagnostics & Environment endpoint
    if (pathname === '/api/info' && method === 'GET') {
      return jsonResponse({
        appName: env.APP_NAME || 'Student Task Manager',
        environment: env.ENVIRONMENT || 'production',
        kvBound: !!env.TASKS_KV,
        timestamp: new Date().toISOString()
      });
    }

    // REST API Routing: /api/tasks and /api/tasks/{id}
    if (pathname.startsWith('/api/tasks')) {
      const kv = env.TASKS_KV;
      if (!kv) {
        return jsonResponse({
          error: 'Cloudflare Workers KV binding TASKS_KV not configured'
        }, 500);
      }

      const pathSegments = pathname.split('/').filter(Boolean);
      // pathSegments = ['api', 'tasks'] or ['api', 'tasks', '{id}']
      const taskId = pathSegments[2] ? decodeURIComponent(pathSegments[2]) : null;

      try {
        // GET /api/tasks - Retrieve all tasks
        if (method === 'GET' && !taskId) {
          const list = await kv.list({ prefix: 'task:' });
          const tasks = [];
          for (const key of list.keys) {
            const task = await kv.get(key.name, 'json');
            if (task) {
              tasks.push(task);
            }
          }

          return jsonResponse(tasks);
        }

        // GET /api/tasks/{id} - Retrieve single task
        if (method === 'GET' && taskId) {
          const task = await kv.get(\`task:\${taskId}\`, 'json');
          if (!task) {
            return jsonResponse({ error: 'Task not found', id: taskId }, 404);
          }
          return jsonResponse(task);
        }

        // POST /api/tasks - Create new task
        if (method === 'POST' && !taskId) {
          let body;
          try {
            body = await request.json();
          } catch (_) {
            return jsonResponse({ error: 'Invalid JSON request body' }, 400);
          }

          if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
            return jsonResponse({ error: 'Field "title" is required' }, 400);
          }

          const list = await kv.list({ prefix: 'task:' });
          const existingIds = list.keys.map(k => k.name.replace('task:', ''));

          const id = body.id || generateTaskId(existingIds);
          const now = new Date().toISOString();

          const newTask = {
            id,
            title: body.title.trim(),
            priority: body.priority || 'Medium',
            category: body.category || 'Assignment',
            status: body.status || 'Pending',
            deadline: body.deadline || null,
            createdAt: now,
            updatedAt: now
          };

          // Save individual task record
          await kv.put(\`task:\${id}\`, JSON.stringify(newTask));

          return jsonResponse(newTask, 201);
        }

        // PUT /api/tasks/{id} - Update existing task
        if (method === 'PUT' && taskId) {
          const existing = await kv.get(\`task:\${taskId}\`, 'json');
          if (!existing) {
            return jsonResponse({ error: 'Task not found', id: taskId }, 404);
          }

          let body;
          try {
            body = await request.json();
          } catch (_) {
            return jsonResponse({ error: 'Invalid JSON request body' }, 400);
          }

          const updatedTask = {
            ...existing,
            title: body.title !== undefined ? String(body.title).trim() : existing.title,
            priority: body.priority !== undefined ? body.priority : existing.priority,
            category: body.category !== undefined ? body.category : existing.category,
            status: body.status !== undefined ? body.status : existing.status,
            deadline: body.deadline !== undefined ? body.deadline : existing.deadline,
            updatedAt: new Date().toISOString()
          };

          await kv.put(\`task:\${taskId}\`, JSON.stringify(updatedTask));
          return jsonResponse(updatedTask, 200);
        }

        // DELETE /api/tasks/{id} - Delete task
        if (method === 'DELETE' && taskId) {
          const existing = await kv.get(\`task:\${taskId}\`, 'json');
          if (!existing) {
            return jsonResponse({ error: 'Task not found', id: taskId }, 404);
          }

          await kv.delete(\`task:\${taskId}\`);

          return jsonResponse({
            message: 'Task removed successfully.',
            id: taskId
          }, 200);
        }

        return jsonResponse({ error: 'Method not allowed on this path' }, 405);
      } catch (err) {
        return jsonResponse({ error: 'Internal Worker Error', details: err.message }, 500);
      }
    }

    return jsonResponse({ error: 'Route not found' }, 404);
  }
};
`;

fs.writeFileSync(workerPath, workerTemplate, 'utf8');
console.log('Successfully compiled application/worker.js with synchronized assets.');
