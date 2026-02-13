const API_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';

let token = localStorage.getItem('token');
let currentUser = null;
let currentProject = null;
let currentFile = null;
let editor = null;
let ws = null;
let sessionId = generateId();
let modalCallback = null;

// Initialize CodeMirror
window.addEventListener('DOMContentLoaded', () => {
  editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    mode: 'javascript',
    theme: 'dracula',
    lineNumbers: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true,
  });

  editor.on('change', () => {
    if (ws && currentFile && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'edit',
        fileId: currentFile.id,
        changes: editor.getValue(),
        userId: currentUser.id,
        sessionId
      }));
    }
  });

  editor.on('cursorActivity', () => {
    if (ws && currentFile && ws.readyState === WebSocket.OPEN) {
      const cursor = editor.getCursor();
      ws.send(JSON.stringify({
        type: 'cursor',
        fileId: currentFile.id,
        position: cursor,
        userId: currentUser.id,
        sessionId
      }));
    }
  });

  if (token) {
    verifyTokenAndLoad();
  }
});

// ===== AUTH FUNCTIONS =====

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));

  if (tab === 'login') {
    document.querySelector('.tab-btn:first-child').classList.add('active');
    document.getElementById('login-form').classList.add('active');
  } else {
    document.querySelector('.tab-btn:last-child').classList.add('active');
    document.getElementById('register-form').classList.add('active');
  }
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('token', token);
      showEditorScreen();
    } else {
      errorDiv.textContent = data.error || 'Login failed';
    }
  } catch (err) {
    errorDiv.textContent = 'Network error';
  }
}

async function register() {
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const errorDiv = document.getElementById('register-error');

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('token', token);
      showEditorScreen();
    } else {
      errorDiv.textContent = data.error || 'Registration failed';
    }
  } catch (err) {
    errorDiv.textContent = 'Network error';
  }
}

function logout() {
  token = null;
  currentUser = null;
  currentProject = null;
  currentFile = null;
  localStorage.removeItem('token');
  if (ws) ws.close();
  
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('editor-screen').classList.remove('active');
}

async function verifyTokenAndLoad() {
  try {
    const response = await fetch(`${API_URL}/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const projects = await response.json();
      // Token is valid, extract user info from token
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUser = { id: payload.id, username: payload.username };
      showEditorScreen();
    } else {
      logout();
    }
  } catch (err) {
    logout();
  }
}

function showEditorScreen() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('editor-screen').classList.add('active');
  document.getElementById('username-display').textContent = currentUser.username;
  loadProjects();
  connectWebSocket();
}

// ===== WEBSOCKET =====

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'user-joined':
        addCollaborator(data.userId, data.sessionId);
        break;
      case 'user-left':
        removeCollaborator(data.sessionId);
        break;
      case 'edit':
        if (data.sessionId !== sessionId) {
          const currentCursor = editor.getCursor();
          editor.setValue(data.changes);
          editor.setCursor(currentCursor);
        }
        break;
      case 'cursor':
        // Show other users' cursors (implement cursor widget)
        break;
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// ===== PROJECT FUNCTIONS =====

async function loadProjects() {
  try {
    const response = await fetch(`${API_URL}/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const projects = await response.json();
    const projectsList = document.getElementById('projects-list');
    projectsList.innerHTML = '';

    projects.forEach(project => {
      const div = document.createElement('div');
      div.className = 'project-item';
      div.innerHTML = `
        <i class="fas fa-folder"></i>
        <span>${project.name}</span>
        <button class="delete-btn" onclick="deleteProject(${project.id}, event)">
          <i class="fas fa-trash"></i>
        </button>
      `;
      div.onclick = (e) => {
        if (!e.target.closest('.delete-btn')) {
          selectProject(project, e);
        }
      };
      projectsList.appendChild(div);
    });
  } catch (err) {
    console.error('Error loading projects:', err);
  }
}

function createProject() {
  showModal('Create New Project', (name) => {
    if (!name) return;

    fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    })
      .then(res => res.json())
      .then(project => {
        loadProjects();
      })
      .catch(err => console.error(err));
  });
}

async function deleteProject(id, event) {
  event.stopPropagation();

  if (!confirm('Delete this project?')) return;

  try {
    await fetch(`${API_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (currentProject && currentProject.id === id) {
      currentProject = null;
      currentFile = null;
      document.getElementById('files-list').innerHTML = '';
      editor.setValue('');
      document.getElementById('new-file-btn').disabled = true;
    }

    loadProjects();
  } catch (err) {
    console.error(err);
  }
}

function selectProject(project, event) {
  currentProject = project;
  currentFile = null;

  document.querySelectorAll('.project-item').forEach(item => {
    item.classList.remove('active');
  });
  event.currentTarget.classList.add('active');

  document.getElementById('new-file-btn').disabled = false;
  loadFiles();
}

// ===== FILE FUNCTIONS =====

async function loadFiles() {
  if (!currentProject) return;

  try {
    const response = await fetch(`${API_URL}/projects/${currentProject.id}/files`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const files = await response.json();
    const filesList = document.getElementById('files-list');
    filesList.innerHTML = '';

    files.forEach(file => {
      const div = document.createElement('div');
      div.className = 'file-item';
      div.innerHTML = `
        <i class="fas fa-file-code"></i>
        <span>${file.filename}</span>
        <button class="delete-btn" onclick="deleteFile(${file.id}, event)">
          <i class="fas fa-trash"></i>
        </button>
      `;
      div.onclick = (e) => {
        if (!e.target.closest('.delete-btn')) {
          selectFile(file, e);
        }
      };
      filesList.appendChild(div);
    });
  } catch (err) {
    console.error(err);
  }
}

function createFile() {
  if (!currentProject) return;

  showModal('Create New File (e.g., script.py)', (filename) => {
    if (!filename) return;

    const language = detectLanguage(filename);

    fetch(`${API_URL}/projects/${currentProject.id}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ filename, language, content: '' })
    })
      .then(res => res.json())
      .then(file => {
        loadFiles();
      })
      .catch(err => console.error(err));
  });
}

async function deleteFile(id, event) {
  event.stopPropagation();

  if (!confirm('Delete this file?')) return;

  try {
    await fetch(`${API_URL}/files/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (currentFile && currentFile.id === id) {
      currentFile = null;
      editor.setValue('');
      disableFileControls();
    }

    loadFiles();
  } catch (err) {
    console.error(err);
  }
}

async function selectFile(file, event) {
  currentFile = file;

  document.querySelectorAll('.file-item').forEach(item => {
    item.classList.remove('active');
  });
  event.currentTarget.classList.add('active');

  const response = await fetch(`${API_URL}/files/${file.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const fileData = await response.json();
  editor.setValue(fileData.content || '');

  document.getElementById('current-file-name').textContent = file.filename;
  document.getElementById('language-selector').value = file.language;
  setEditorMode(file.language);

  enableFileControls();

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'join',
      fileId: file.id,
      userId: currentUser.id,
      sessionId
    }));
  }
}

function setEditorMode(language) {
  const modes = {
    javascript: 'javascript',
    python: 'python',
    java: 'text/x-java',
    cpp: 'text/x-c++src',
    c: 'text/x-csrc',
    ruby: 'ruby',
    go: 'go',
    php: 'php',
    bash: 'shell'
  };

  editor.setOption('mode', modes[language] || 'javascript');
}

function detectLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const langMap = {
    js: 'javascript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    rb: 'ruby',
    go: 'go',
    php: 'php',
    sh: 'bash',
    pl: 'perl'
  };

  return langMap[ext] || 'javascript';
}

function changeLanguage() {
  if (!currentFile) return;

  const language = document.getElementById('language-selector').value;
  setEditorMode(language);

  fetch(`${API_URL}/files/${currentFile.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ language })
  });
}

async function saveFile() {
  if (!currentFile) return;

  try {
    const content = editor.getValue();

    await fetch(`${API_URL}/files/${currentFile.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    });

    showOutput('✓ File saved successfully', true);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'save',
        fileId: currentFile.id,
        content
      }));
    }
  } catch (err) {
    showOutput('Error saving file: ' + err.message, false);
  }
}

async function downloadFile() {
  if (!currentFile) return;

  try {
    const response = await fetch(`${API_URL}/files/${currentFile.id}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.filename;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    showOutput('Error downloading file: ' + err.message, false);
  }
}

async function runCode() {
  if (!currentFile) return;

  const code = editor.getValue();
  const language = document.getElementById('language-selector').value;

  if (!language) {
    showOutput('Please select a language first', false);
    return;
  }

  showOutput('Running code...', true);

  try {
    const response = await fetch(`${API_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ code, language })
    });

    const result = await response.json();

    if (result.success) {
      showOutput(result.output, true);
    } else {
      showOutput(result.error, false);
    }
  } catch (err) {
    showOutput('Execution error: ' + err.message, false);
  }
}

function showOutput(text, success) {
  const outputDiv = document.getElementById('output-content');
  const className = success ? 'output-success' : 'output-error';
  outputDiv.innerHTML = `<div class="${className}">${escapeHtml(text)}</div>`;
}

function clearOutput() {
  document.getElementById('output-content').innerHTML = '';
}

function enableFileControls() {
  document.getElementById('language-selector').disabled = false;
  document.getElementById('save-btn').disabled = false;
  document.getElementById('download-btn').disabled = false;
  document.getElementById('run-btn').disabled = false;
}

function disableFileControls() {
  document.getElementById('language-selector').disabled = true;
  document.getElementById('save-btn').disabled = true;
  document.getElementById('download-btn').disabled = true;
  document.getElementById('run-btn').disabled = true;
}

// ===== COLLABORATORS =====

const collaborators = new Map();

function addCollaborator(userId, sessionId) {
  if (!collaborators.has(sessionId)) {
    collaborators.set(sessionId, userId);
    updateCollaboratorsList();
  }
}

function removeCollaborator(sessionId) {
  collaborators.delete(sessionId);
  updateCollaboratorsList();
}

function updateCollaboratorsList() {
  const list = document.getElementById('collaborators-list');
  document.getElementById('user-count').textContent = collaborators.size + 1;

  list.innerHTML = `
    <div class="collaborator">
      <div class="collaborator-indicator"></div>
      <span>${currentUser.username} (you)</span>
    </div>
  `;

  collaborators.forEach((userId, sessionId) => {
    const div = document.createElement('div');
    div.className = 'collaborator';
    div.innerHTML = `
      <div class="collaborator-indicator"></div>
      <span>User ${userId}</span>
    `;
    list.appendChild(div);
  });
}

// ===== MODAL =====

function showModal(title, callback) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-input').value = '';
  document.getElementById('modal').classList.add('active');
  modalCallback = callback;
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  modalCallback = null;
}

function confirmModal() {
  const value = document.getElementById('modal-input').value.trim();
  if (modalCallback) {
    modalCallback(value);
  }
  closeModal();
}

// ===== UTILITIES =====

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('modal');
  if (modal.classList.contains('active') && e.key === 'Enter') {
    confirmModal();
  }
});