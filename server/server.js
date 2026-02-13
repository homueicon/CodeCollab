const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const { pool, initDB, checkDatabase } = require('./database');
const { executeCode } = require('./executor');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// AUTH ROUTES
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user });
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PROJECT ROUTES
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const result = await pool.query(
      'INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );

    await pool.query(
      'INSERT INTO project_collaborators (project_id, user_id, role) VALUES ($1, $2, $3)',
      [result.rows[0].id, req.user.id, 'owner']
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT p.* FROM projects p
       LEFT JOIN project_collaborators pc ON p.id = pc.project_id
       WHERE p.owner_id = $1 OR pc.user_id = $1
       ORDER BY p.updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or you are not the owner' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FILE ROUTES
app.post('/api/projects/:projectId/files', authenticateToken, async (req, res) => {
  try {
    const { filename, language, content } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const result = await pool.query(
      'INSERT INTO files (project_id, filename, language, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.projectId, filename, language || 'javascript', content || '']
    );

    await pool.query(
      'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.params.projectId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'A file with this name already exists in the project' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.get('/api/projects/:projectId/files', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM files WHERE project_id = $1 ORDER BY filename',
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM files WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const { content, filename, language } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramCount++}`);
      values.push(content);
    }
    if (filename !== undefined) {
      updates.push(`filename = $${paramCount++}`);
      values.push(filename);
    }
    if (language !== undefined) {
      updates.push(`language = $${paramCount++}`);
      values.push(language);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE files SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    await pool.query(
      'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [result.rows[0].project_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM files WHERE id = $1 RETURNING project_id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    await pool.query(
      'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [result.rows[0].project_id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/files/:id/download', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM files WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(file.content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CODE EXECUTION
app.post('/api/execute', authenticateToken, async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    const result = await executeCode(code, language);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WEBSOCKET
const clients = new Map();

wss.on('connection', (ws) => {
  let sessionId = null;
  let userId = null;
  let fileId = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'join':
          sessionId = data.sessionId;
          userId = data.userId;
          fileId = data.fileId;
          clients.set(sessionId, { ws, fileId, userId });

          broadcast(fileId, {
            type: 'user-joined',
            userId,
            sessionId
          }, sessionId);
          break;

        case 'edit':
          broadcast(fileId, {
            type: 'edit',
            changes: data.changes,
            userId,
            sessionId
          }, sessionId);
          break;

        case 'cursor':
          broadcast(fileId, {
            type: 'cursor',
            position: data.position,
            userId,
            sessionId
          }, sessionId);
          break;

        case 'save':
          if (data.content !== undefined && fileId) {
            await pool.query(
              'UPDATE files SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [data.content, fileId]
            );
          }
          break;
      }
    } catch (err) {
      console.error('WebSocket error:', err);
    }
  });

  ws.on('close', () => {
    if (sessionId) {
      clients.delete(sessionId);
      if (fileId) {
        broadcast(fileId, {
          type: 'user-left',
          userId,
          sessionId
        }, sessionId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcast(targetFileId, message, excludeSessionId) {
  clients.forEach((clientData, sid) => {
    if (sid !== excludeSessionId && 
        clientData.fileId === targetFileId && 
        clientData.ws.readyState === WebSocket.OPEN) {
      clientData.ws.send(JSON.stringify(message));
    }
  });
}

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// START SERVER
async function startServer() {
  try {
    console.log('');
    console.log('=====================================');
    console.log('  CodeCollab Server Starting...');
    console.log('=====================================');
    console.log('');

    const dbOk = await checkDatabase();
    if (!dbOk) {
      console.error('❌ Cannot connect to PostgreSQL database');
      console.error('   Please check your database configuration in .env file');
      console.error('   Make sure PostgreSQL is running and database exists');
      process.exit(1);
    }

    await initDB();

    server.listen(PORT, () => {
      console.log('');
      console.log('=====================================');
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log('=====================================');
      console.log('');
    });

  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
startServer();

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    pool.end(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});
