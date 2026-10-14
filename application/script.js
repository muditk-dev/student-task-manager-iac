// Student Task Manager - Frontend Controller
(function() {
  'use strict';

  // Base API configuration
  const API_BASE = window.location.origin.includes('http') 
    ? `${window.location.origin}/api/tasks` 
    : '/api/tasks';

  // State
  let tasks = [];
  let filterState = {
    search: '',
    status: 'ALL',
    priority: 'ALL',
    category: 'ALL',
    sort: 'date-desc'
  };

  // DOM Elements
  const appTitleEl = document.getElementById('app-title');
  const envBadgeEl = document.getElementById('env-badge');
  const connectionStatusEl = document.getElementById('connection-status');
  const createForm = document.getElementById('create-task-form');
  const submitBtn = document.getElementById('submit-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const searchInput = document.getElementById('search-input');
  const filterStatus = document.getElementById('filter-status');
  const filterPriority = document.getElementById('filter-priority');
  const filterCategory = document.getElementById('filter-category');
  const sortBy = document.getElementById('sort-by');
  const tasksTable = document.getElementById('tasks-table');
  const tasksTbody = document.getElementById('tasks-tbody');
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  
  // Stats Elements
  const statTotal = document.getElementById('stat-total');
  const statPending = document.getElementById('stat-pending');
  const statProgress = document.getElementById('stat-progress');
  const statCompleted = document.getElementById('stat-completed');
  const completionRate = document.getElementById('completion-rate');
  const progressBar = document.getElementById('progress-bar');

  // Edit Modal Elements
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-task-form');
  const editTaskId = document.getElementById('edit-task-id');
  const editTaskTitle = document.getElementById('edit-task-title');
  const editTaskPriority = document.getElementById('edit-task-priority');
  const editTaskCategory = document.getElementById('edit-task-category');
  const editTaskStatus = document.getElementById('edit-task-status');
  const editTaskDeadline = document.getElementById('edit-task-deadline');
  const modalClose = document.getElementById('modal-close');
  const modalCancel = document.getElementById('modal-cancel');

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
    bindEvents();
    fetchTasks();
  });

  // Initialize App and Server Info
  async function initApp() {
    try {
      const res = await fetch('/api/info');
      if (res.ok) {
        const info = await res.json();
        if (info.appName && appTitleEl) {
          appTitleEl.textContent = info.appName;
          document.title = info.appName;
        }
        if (info.environment && envBadgeEl) {
          envBadgeEl.textContent = info.environment.toUpperCase();
        }
      }
    } catch (_) {
      // Use defaults if not on worker
    }
  }

  // Bind Event Listeners
  function bindEvents() {
    createForm.addEventListener('submit', handleCreateTask);
    refreshBtn.addEventListener('click', fetchTasks);
    
    // Quick example chips
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById('task-title').value = chip.dataset.title;
        document.getElementById('task-priority').value = chip.dataset.priority;
        document.getElementById('task-category').value = chip.dataset.cat;
        document.getElementById('task-title').focus();
      });
    });

    // Filters and Search
    searchInput.addEventListener('input', (e) => {
      filterState.search = e.target.value.toLowerCase().trim();
      renderTasks();
    });

    filterStatus.addEventListener('change', (e) => {
      filterState.status = e.target.value;
      renderTasks();
    });

    filterPriority.addEventListener('change', (e) => {
      filterState.priority = e.target.value;
      renderTasks();
    });

    filterCategory.addEventListener('change', (e) => {
      filterState.category = e.target.value;
      renderTasks();
    });

    sortBy.addEventListener('change', (e) => {
      filterState.sort = e.target.value;
      renderTasks();
    });

    // Edit Modal events
    modalClose.addEventListener('click', closeEditModal);
    modalCancel.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });
    editForm.addEventListener('submit', handleUpdateTask);
  }

  // Fetch all tasks from Cloudflare Worker KV via GET /api/tasks
  async function fetchTasks() {
    setLoading(true);
    setConnectionStatus('connecting', 'Connecting...');
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) {
        throw new Error(`Failed to load tasks: HTTP ${res.status}`);
      }
      const data = await res.json();
      tasks = Array.isArray(data) ? data : (data.tasks || []);
      setConnectionStatus('connected', 'KV Connected');
      renderTasks();
    } catch (err) {
      console.warn('API fetch error, attempting fallback:', err);
      setConnectionStatus('error', 'KV Offline (Demo Mode)');
      // If run locally without backend, provide demo sample tasks
      if (tasks.length === 0) {
        tasks = [
          {
            id: 'T101',
            title: 'Complete Cloud Computing Assignment',
            priority: 'High',
            category: 'Assignment',
            status: 'Pending',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            deadline: ''
          },
          {
            id: 'T102',
            title: 'Prepare Final Year Project Presentation',
            priority: 'High',
            category: 'Project',
            status: 'Pending',
            createdAt: new Date().toISOString(),
            deadline: ''
          }
        ];
      }
      renderTasks();
    } finally {
      setLoading(false);
    }
  }

  // Create Task via POST /api/tasks
  async function handleCreateTask(e) {
    e.preventDefault();
    const titleInput = document.getElementById('task-title');
    const prioritySelect = document.getElementById('task-priority');
    const categorySelect = document.getElementById('task-category');
    const statusSelect = document.getElementById('task-status');
    const deadlineInput = document.getElementById('task-deadline');

    const newTask = {
      title: titleInput.value.trim(),
      priority: prioritySelect.value,
      category: categorySelect.value,
      status: statusSelect.value,
      deadline: deadlineInput.value || null
    };

    if (!newTask.title) return;

    setButtonLoading(submitBtn, true, 'Creating...');

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const createdTask = await res.json();
      tasks.unshift(createdTask);
      createForm.reset();
      prioritySelect.value = 'Medium';
      categorySelect.value = 'Assignment';
      statusSelect.value = 'Pending';
      
      showToast('Task successfully created.', 'success');
      renderTasks();
    } catch (err) {
      console.warn('Backend unavailable, saving locally for preview:', err);
      const fallbackTask = {
        id: `T${100 + tasks.length + 1}`,
        ...newTask,
        createdAt: new Date().toISOString()
      };
      tasks.unshift(fallbackTask);
      createForm.reset();
      showToast('Task successfully created.', 'success');
      renderTasks();
    } finally {
      setButtonLoading(submitBtn, false, 'Create Task');
    }
  }

  // Quick Toggle Task Status (Pending <-> Completed) via PUT /api/tasks/{id}
  async function toggleTaskStatus(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    const updatedPayload = { ...task, status: newStatus };

    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });

      if (res.ok) {
        const updated = await res.json();
        Object.assign(task, updated);
      } else {
        task.status = newStatus;
      }
      showToast('Status changed successfully.', 'success');
      renderTasks();
    } catch (_) {
      task.status = newStatus;
      showToast('Status changed successfully.', 'success');
      renderTasks();
    }
  }

  // Open Edit Modal
  function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editTaskId.value = task.id;
    editTaskTitle.value = task.title;
    editTaskPriority.value = task.priority || 'Medium';
    editTaskCategory.value = task.category || 'Assignment';
    editTaskStatus.value = task.status || 'Pending';
    editTaskDeadline.value = task.deadline || '';

    editModal.classList.remove('hidden');
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
    editForm.reset();
  }

  // Save Task Update via PUT /api/tasks/{id}
  async function handleUpdateTask(e) {
    e.preventDefault();
    const id = editTaskId.value;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const updatedData = {
      ...task,
      title: editTaskTitle.value.trim(),
      priority: editTaskPriority.value,
      category: editTaskCategory.value,
      status: editTaskStatus.value,
      deadline: editTaskDeadline.value || null
    };

    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (res.ok) {
        const saved = await res.json();
        Object.assign(task, saved);
      } else {
        Object.assign(task, updatedData);
      }
      showToast('Status changed successfully.', 'success');
      closeEditModal();
      renderTasks();
    } catch (_) {
      Object.assign(task, updatedData);
      showToast('Status changed successfully.', 'success');
      closeEditModal();
      renderTasks();
    }
  }

  // Delete Task via DELETE /api/tasks/{id}
  async function deleteTask(id) {
    if (!confirm(`Are you sure you want to remove task ${id}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok && res.status !== 404) {
        throw new Error('Failed to delete');
      }
    } catch (_) {
      // Continue removing from local state
    }

    tasks = tasks.filter(t => t.id !== id);
    showToast('Task removed successfully.', 'success');
    renderTasks();
  }

  // Filter and Sort Tasks
  function getFilteredTasks() {
    return tasks.filter(task => {
      // Search
      if (filterState.search) {
        const text = `${task.id} ${task.title}`.toLowerCase();
        if (!text.includes(filterState.search)) return false;
      }
      // Status
      if (filterState.status !== 'ALL' && task.status !== filterState.status) {
        return false;
      }
      // Priority
      if (filterState.priority !== 'ALL' && task.priority !== filterState.priority) {
        return false;
      }
      // Category
      if (filterState.category !== 'ALL' && task.category !== filterState.category) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      const priorityWeights = { High: 3, Medium: 2, Low: 1 };
      switch (filterState.sort) {
        case 'date-desc':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'date-asc':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'priority-desc':
          return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });
  }

  // Render Tasks & Update Dashboard Statistics
  function renderTasks() {
    updateStatistics();
    const filtered = getFilteredTasks();

    if (tasks.length === 0 || filtered.length === 0) {
      tasksTable.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    tasksTable.classList.remove('hidden');
    tasksTbody.innerHTML = '';

    filtered.forEach(task => {
      const tr = document.createElement('tr');
      const priorityClass = (task.priority || 'medium').toLowerCase();
      const statusClass = (task.status || 'pending').toLowerCase().replace(' ', '-');
      const isCompleted = task.status === 'Completed';

      tr.innerHTML = `
        <td><span class="task-id-badge">${escapeHtml(task.id)}</span></td>
        <td>
          <div class="task-title-cell ${isCompleted ? 'completed' : ''}">${escapeHtml(task.title)}</div>
          <div class="task-meta">
            ${task.deadline ? `Due: ${escapeHtml(task.deadline)} &bull; ` : ''}
            Created: ${formatDate(task.createdAt)}
          </div>
        </td>
        <td><span class="category-tag">${escapeHtml(task.category || 'General')}</span></td>
        <td><span class="priority-badge ${priorityClass}">${escapeHtml(task.priority || 'Medium')}</span></td>
        <td><span class="status-badge ${statusClass}">${escapeHtml(task.status || 'Pending')}</span></td>
        <td style="text-align: right;">
          <div class="table-actions">
            <button class="btn btn-sm btn-toggle-status" data-action="toggle" data-id="${task.id}" title="Toggle Complete">
              ${isCompleted ? 'Reopen' : 'Done'}
            </button>
            <button class="btn btn-sm btn-outline" data-action="edit" data-id="${task.id}" title="Edit Task">
              Edit
            </button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${task.id}" title="Delete Task">
              Delete
            </button>
          </div>
        </td>
      `;

      // Bind buttons
      tr.querySelector('[data-action="toggle"]').addEventListener('click', () => toggleTaskStatus(task.id));
      tr.querySelector('[data-action="edit"]').addEventListener('click', () => openEditModal(task.id));
      tr.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTask(task.id));

      tasksTbody.appendChild(tr);
    });
  }

  // Update Summary Statistics
  function updateStatistics() {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const progress = tasks.filter(t => t.status === 'In Progress').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    statTotal.textContent = total;
    statPending.textContent = pending;
    statProgress.textContent = progress;
    statCompleted.textContent = completed;
    completionRate.textContent = `${rate}%`;
    progressBar.style.width = `${rate}%`;
  }

  // Helpers
  function setLoading(isLoading) {
    if (isLoading) {
      loadingState.classList.remove('hidden');
      tasksTable.classList.add('hidden');
      emptyState.classList.add('hidden');
    } else {
      loadingState.classList.add('hidden');
    }
  }

  function setConnectionStatus(type, text) {
    connectionStatusEl.className = `badge badge-status ${type}`;
    connectionStatusEl.textContent = text;
  }

  function setButtonLoading(button, isLoading, text) {
    const textSpan = button.querySelector('.btn-text');
    const spinner = button.querySelector('.btn-spinner');
    if (isLoading) {
      button.disabled = true;
      if (textSpan) textSpan.textContent = text;
      if (spinner) spinner.classList.remove('hidden');
    } else {
      button.disabled = false;
      if (textSpan) textSpan.textContent = text;
      if (spinner) spinner.classList.add('hidden');
    }
  }

  function formatDate(isoString) {
    if (!isoString) return 'Today';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (_) {
      return 'Recent';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

})();
