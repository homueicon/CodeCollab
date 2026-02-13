# 🚀 CodeCollab

|OS/Kernel Compatibility.      |
|------------------------------|
| *Windows: Partially Working* |
| *Linux: Working*             |
| *MacOS: Working*             |
|*OS/2: Unsupported*           |
|*HomuOS: Working but has bugs*|

# **A powerful, real-time collaborative code editor built with Electron and PostgreSQL**

## ✨ Features

-  **Real-time Collaboration** - Multiple users editing simultaneously
-  **PostgreSQL Storage** - All files stored securely in database
-  **Electron Desktop App** - Native desktop experience
-  **Web Interface** - Also works in browser
-  **Code Execution** - Run code directly (10+ languages)
-  **Syntax Highlighting** - Beautiful code editor with CodeMirror
-  **Project Management** - Organize files into projects
-  **User System** - Secure authentication with JWT
-  **WebSocket Sync** - Lightning-fast real-time updates
-  **File Download** - Export your code anytime

## 🎯 Quick Start
```bash
# 1. Extract & enter directory
cd CodeCollab

# 2. Install dependencies
npm install

# 3. Create database
psql -U postgres -c "CREATE DATABASE codecollab;"

# 4. Configure .env with your DB password
nano .env

# 5. Run!
npm start
```

## 📋 Prerequisites

- **Node.js** v16+ ([Download](https://nodejs.org/))
- **PostgreSQL** v12+ ([Download](https://www.postgresql.org/download/))

## 📖 Installation

### Step 1: Install PostgreSQL

**Windows:**
- Download installer from postgresql.org
- Run installer and remember your password

**Mac:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt install postgresql postgresql-contrib
sudo service postgresql start
```

### Step 2: Create Database
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE codecollab;

# Exit
\q
```

### Step 3: Install & Configure
```bash
# Install dependencies
npm install

# Edit .env file with your password
nano .env
```

Change this line in `.env`:
```env
DB_PASSWORD=your_actual_postgres_password
```

### Step 4: Run
```bash
# Start Electron app (recommended)
npm start

# OR web browser only
npm run dev
```

## 🔧 Available Commands
```bash
npm start          # Launch Electron app
npm run dev        # Web server only (http://localhost:3001)
npm run electron   # Electron only (server must be running)
npm run build      # Build for all platforms
npm run build:win  # Build Windows .exe
npm run build:mac  # Build macOS .dmg
npm run build:linux # Build Linux AppImage
```

## 🛠️ Supported Languages

| Language   | Extension | Execute |
|-----------|-----------|---------|
| JavaScript | .js       | Working      |
| Python     | .py       | Working      |
| Java       | .java     | Working      |
| C++        | .cpp      | Working      |
| C          | .c        | Working      |
| Ruby       | .rb       | Working      |
| Go         | .go       | Working      |
| PHP        | .php      | Working      |
| Bash       | .sh       | Working      |
| Perl       | .pl       | Working      |

**Note:** To run code, you need the language runtime installed.

## 📁 Project Structure
```
CodeCollab/
├── main.js              # Electron entry point
├── package.json         # Dependencies & scripts
├── .env                 # Configuration (don't commit!)
├── server/
│   ├── server.js       # Express API + WebSocket
│   ├── database.js     # PostgreSQL setup
│   └── executor.js     # Code execution engine
├── public/
│   ├── index.html      # UI structure
│   ├── style.css       # Styling
│   └── app.js          # Frontend logic
├── scripts/
│   ├── setup.js        # Post-install automation
│   └── start.js        # Launcher script
└── uploads/            # Temporary storage
```

## 🎮 Usage

### Creating Your First Project

1. **Register/Login** - Create an account or login
2. **New Project** - Click the + button next to "Projects"
3. **New File** - Click + next to "Files" (e.g., `script.py`)
4. **Write Code** - Use the editor with syntax highlighting
5. **Save** - Click the Save button
6. **Run** - Click Run to execute your code
7. **Download** - Click Download to save locally

### Collaboration

- Multiple users can edit the same file in real-time
- See active users in the top-right panel
- Changes sync automatically via WebSocket

## 🐛 Troubleshooting

### Database Connection Failed

**Problem:** Can't connect to PostgreSQL

**Solution:**
```bash
# Check if PostgreSQL is running
sudo service postgresql status  # Linux
brew services list              # Mac

# Verify credentials in .env
nano .env

# Test connection
psql -U postgres -d codecollab
```

### Port 3001 Already in Use
### Note by homueicon: To get .env key:

# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL, reset password
ALTER USER postgres PASSWORD 'your_new_password';

# Exit
\q
### Thats it (by experience i think)

**Solution:** Change port in `.env`:
```env
PORT=3002
```

### Code Execution Not Working

**Problem:** "Command not found" when running code

**Solution:** Install the language runtime:
```bash
# Python
sudo apt install python3      # Linux
brew install python3          # Mac

# Java
sudo apt install default-jdk  # Linux
brew install java             # Mac

# GCC (C/C++)
sudo apt install build-essential  # Linux
xcode-select --install            # Mac
```

### npm install Fails

**Solution:**
```bash
# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 🔐 Security

-  Bcrypt password hashing
-  JWT token authentication  
-  SQL injection prevention
-  Input validation
-  5-10 Second Exec Timeout.  

**Important for Production:**
1. Change `JWT_SECRET` in `.env`
2. Use strong PostgreSQL password
3. Don't commit `.env` file
4. Enable SSL/TLS for connections

## 🏗️ Building Executables

### Windows
```bash
npm run build:win
```
Output: `dist/CodeCollab Setup.exe`

### macOS
```bash
npm run build:mac
```
Output: `dist/CodeCollab.dmg`

### Linux
```bash
npm run build:linux
```
Output: `dist/CodeCollab.AppImage`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) - Desktop framework
- [Express](https://expressjs.com/) - Web framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [CodeMirror](https://codemirror.net/) - Code editor
- [WebSocket](https://github.com/websockets/ws) - Real-time communication

## 📞 Support

For issues or questions:
- Check the Troubleshooting section
- Review the documentation
- Open an issue on GitHub

---

**Built for developers who collaborate**
**Made by:**

**Homueicon**
