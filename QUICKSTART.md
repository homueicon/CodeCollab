# CodeCollab - Quick Start Guide

## Installation (3 Minutes)

### 1. Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Install and remember your password

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

### 2. Create Database
```bash
psql -U postgres
CREATE DATABASE codecollab;
\q
```

### 3. Install & Configure
```bash
cd CodeCollab
npm install
```

Edit `.env` file:
```env
DB_PASSWORD=your_postgres_password_here
```

### 4. Run
```bash
npm start
```

**Done!** The app launches automatically.

## First Steps

1. **Register** - Create your account
2. **New Project** - Click + next to Projects
3. **New File** - Click + next to Files (e.g., `test.py`)
4. **Write Code** - Start coding with syntax highlighting
5. **Run** - Click the Run button to execute
6. **Save** - Click Save to store in database
7. **Download** - Export files anytime

## Common Commands
```bash
npm start          # Electron desktop app
npm run dev        # Web browser only
npm run build:win  # Build .exe file
```

## Supported Languages

✅ JavaScript, Python, Java, C++, C, Ruby, Go, PHP, Bash, Perl

**Note:** Install language runtimes to execute code:
```bash
# Python
python3 --version

# Java  
javac -version

# C/C++
gcc --version
```

## Troubleshooting

**Database error?**
- Check PostgreSQL is running
- Verify password in `.env`

**Code won't run?**
- Install the language runtime
- Example: `sudo apt install python3`

**Port 3001 in use?**
- Change `PORT=3002` in `.env`

## Full Documentation

See `README.md` for complete guide.

---

**Need Help?** Open an issue or check the README!
```

## 15. Create uploads/.gitkeep

Create an empty file at `uploads/.gitkeep` (just create the folder and put an empty file named `.gitkeep` inside).

---

## 🎯 Folder Structure

Create these folders:
```
CodeCollab/
├── server/
├── scripts/
├── public/
└── uploads/