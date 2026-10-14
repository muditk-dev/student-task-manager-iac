// Comprehensive Test Suite for Student Task Manager Serverless Application
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-Memory Cloudflare Workers KV Mock implementation
class MockKVNamespace {
  constructor() {
    this.store = new Map();
  }

  async get(key, type = 'text') {
    if (!this.store.has(key)) return null;
    const raw = this.store.get(key);
    if (type === 'json') {
      try {
        return JSON.parse(raw);
      } catch (_) {
        return null;
      }
    }
    return raw;
  }

  async put(key, value) {
    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  async delete(key) {
    this.store.delete(key);
  }

  async list(options = {}) {
    const prefix = options.prefix || '';
    const keys = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        keys.push({ name: key });
      }
    }
    return { keys };
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Student Task Manager Test Suite');
  console.log('====================================================\n');

  // Test 1: Verify Assets Consistency
  console.log('▶ Test 1: Verifying frontend files exist and are readable...');
  const appDir = path.join(__dirname, '..', 'application');
  assert.ok(fs.existsSync(path.join(appDir, 'index.html')), 'index.html must exist');
  assert.ok(fs.existsSync(path.join(appDir, 'style.css')), 'style.css must exist');
  assert.ok(fs.existsSync(path.join(appDir, 'script.js')), 'script.js must exist');
  assert.ok(fs.existsSync(path.join(appDir, 'worker.js')), 'worker.js must exist');
  console.log('  ✓ All frontend and worker files verified on disk.\n');

  // Import worker module directly
  const workerModule = await import('../application/worker.js');
  const worker = workerModule.default;
  assert.ok(worker && typeof worker.fetch === 'function', 'Worker must export fetch handler');

  const mockKv = new MockKVNamespace();
  const mockEnv = {
    TASKS_KV: mockKv,
    ENVIRONMENT: 'test',
    APP_NAME: 'Student Task Manager'
  };

  // Helper to make mock requests
  async function dispatch(pathname, method = 'GET', body = null) {
    const init = { method };
    if (body !== null) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    const request = new Request(`https://student-tasks.workers.dev${pathname}`, init);
    return await worker.fetch(request, mockEnv, {});
  }

  // Test 2: Web Interface serving
  console.log('▶ Test 2: Testing Static Web Interface Serving (HTML, CSS, JS)...');
  const resHtml = await dispatch('/');
  assert.strictEqual(resHtml.status, 200);
  assert.ok(resHtml.headers.get('content-type').includes('text/html'));
  const htmlBody = await resHtml.text();
  assert.ok(htmlBody.includes('Student Task Manager'), 'HTML must contain title');

  const resCss = await dispatch('/style.css');
  assert.strictEqual(resCss.status, 200);
  assert.ok(resCss.headers.get('content-type').includes('text/css'));

  const resJs = await dispatch('/script.js');
  assert.strictEqual(resJs.status, 200);
  assert.ok(resJs.headers.get('content-type').includes('javascript'));
  console.log('  ✓ HTML, CSS, and JS served with correct Content-Type headers.\n');

  // Test 3: Info & Diagnostics
  console.log('▶ Test 3: Testing /api/info diagnostics...');
  const resInfo = await dispatch('/api/info');
  assert.strictEqual(resInfo.status, 200);
  const infoData = await resInfo.json();
  assert.strictEqual(infoData.appName, 'Student Task Manager');
  assert.strictEqual(infoData.environment, 'test');
  assert.strictEqual(infoData.kvBound, true);
  console.log('  ✓ /api/info verified.\n');

  // Test 4: CRUD - Create Task (PDF Test Case 1)
  console.log('▶ Test 4: Testing FR1 / POST /api/tasks (Create Task - PDF Test Case 1)...');
  const taskPayload = {
    title: 'Prepare Final Year Project Presentation',
    priority: 'High',
    status: 'Pending',
    category: 'Project'
  };
  const resCreate = await dispatch('/api/tasks', 'POST', taskPayload);
  assert.strictEqual(resCreate.status, 201, 'POST /api/tasks must return 201 Created');
  const created = await resCreate.json();
  assert.strictEqual(created.title, taskPayload.title);
  assert.strictEqual(created.priority, 'High');
  assert.strictEqual(created.status, 'Pending');
  assert.strictEqual(created.category, 'Project');
  assert.ok(created.id, 'Created task must have an ID');
  assert.ok(created.createdAt, 'Created task must have a createdAt timestamp');
  console.log(`  ✓ Task successfully created with ID: ${created.id}\n`);

  // Test 5: CRUD - Read Task (PDF Test Case 2)
  console.log('▶ Test 5: Testing FR2 / GET /api/tasks and GET /api/tasks/{id} (PDF Test Case 2)...');
  const resList = await dispatch('/api/tasks');
  assert.strictEqual(resList.status, 200);
  const list = await resList.json();
  assert.ok(Array.isArray(list), 'GET /api/tasks must return an array');
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, created.id);

  const resGetOne = await dispatch(`/api/tasks/${created.id}`);
  assert.strictEqual(resGetOne.status, 200);
  const retrievedOne = await resGetOne.json();
  assert.strictEqual(retrievedOne.id, created.id);
  assert.strictEqual(retrievedOne.title, taskPayload.title);
  console.log('  ✓ Previously created task successfully displayed and retrieved.\n');

  // Test 6: CRUD - Update Task (PDF Test Case 3)
  console.log('▶ Test 6: Testing FR3 / PUT /api/tasks/{id} (Update Task - PDF Test Case 3)...');
  const updatePayload = {
    status: 'Completed'
  };
  const resUpdate = await dispatch(`/api/tasks/${created.id}`, 'PUT', updatePayload);
  assert.strictEqual(resUpdate.status, 200);
  const updated = await resUpdate.json();
  assert.strictEqual(updated.status, 'Completed');
  assert.strictEqual(updated.title, taskPayload.title, 'Preserves title');
  console.log('  ✓ Status changed successfully to "Completed".\n');

  // Test 7: CRUD - Delete Task (PDF Test Case 4)
  console.log('▶ Test 7: Testing FR4 / DELETE /api/tasks/{id} (Delete Task - PDF Test Case 4)...');
  const resDelete = await dispatch(`/api/tasks/${created.id}`, 'DELETE');
  assert.strictEqual(resDelete.status, 200);
  const deleteResult = await resDelete.json();
  assert.strictEqual(deleteResult.id, created.id);
  assert.strictEqual(deleteResult.message, 'Task removed successfully.');

  // Verify it is gone
  const resGetAfterDelete = await dispatch(`/api/tasks/${created.id}`);
  assert.strictEqual(resGetAfterDelete.status, 404);

  const resListAfterDelete = await dispatch('/api/tasks');
  const listAfterDelete = await resListAfterDelete.json();
  assert.strictEqual(listAfterDelete.length, 0);
  console.log('  ✓ Task removed successfully and confirmed 404 on subsequent get.\n');

  // Test 8: Input validation & error handling
  console.log('▶ Test 8: Testing Input Validation...');
  const resInvalid = await dispatch('/api/tasks', 'POST', { title: '   ' });
  assert.strictEqual(resInvalid.status, 400);

  const resMissing = await dispatch('/api/tasks/NON_EXISTENT_ID');
  assert.strictEqual(resMissing.status, 404);
  console.log('  ✓ Validation and 404 error responses confirmed.\n');

  // Test 9: CORS Headers
  console.log('▶ Test 9: Testing CORS preflight and headers...');
  const resCors = await dispatch('/api/tasks', 'OPTIONS');
  assert.strictEqual(resCors.status, 204);
  assert.strictEqual(resCors.headers.get('access-control-allow-origin'), '*');
  console.log('  ✓ CORS preflight headers verified.\n');

  console.log('====================================================');
  console.log('🎉 ALL APPLICATION AND API TESTS PASSED SUCCESSFULLY');
  console.log('====================================================');
}

runTestSuite().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
