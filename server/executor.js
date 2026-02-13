const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TIMEOUT = 10000;

const languageCommands = {
  javascript: { cmd: 'node', args: [], ext: '.js' },
  python: { cmd: 'python3', args: [], ext: '.py' },
  java: { cmd: 'javac', compileOnly: true, ext: '.java' },
  cpp: { cmd: 'g++', args: ['-o', 'output'], compile: true, ext: '.cpp' },
  c: { cmd: 'gcc', args: ['-o', 'output'], compile: true, ext: '.c' },
  ruby: { cmd: 'ruby', args: [], ext: '.rb' },
  go: { cmd: 'go', args: ['run'], ext: '.go' },
  php: { cmd: 'php', args: [], ext: '.php' },
  bash: { cmd: 'bash', args: [], ext: '.sh' },
  perl: { cmd: 'perl', args: [], ext: '.pl' },
};

async function executeCode(code, language) {
  language = language.toLowerCase();

  const langConfig = languageCommands[language];
  if (!langConfig) {
    return { 
      success: false, 
      error: `Language '${language}' is not supported.\nSupported: ${Object.keys(languageCommands).join(', ')}` 
    };
  }

  const tempDir = path.join(require('os').tmpdir(), 'codecollab-exec', uuidv4());
  await fs.mkdir(tempDir, { recursive: true });

  const filename = `code${langConfig.ext}`;
  const filepath = path.join(tempDir, filename);

  try {
    await fs.writeFile(filepath, code);

    if (language === 'java') {
      return await executeJava(code, tempDir, filepath);
    }

    if (langConfig.compile) {
      const compileResult = await runCommand(
        langConfig.cmd,
        [...langConfig.args, filepath],
        tempDir,
        TIMEOUT
      );

      if (!compileResult.success) {
        return compileResult;
      }

      return await runCommand('./output', [], tempDir, TIMEOUT);
    }

    return await runCommand(
      langConfig.cmd,
      [...langConfig.args, filepath],
      tempDir,
      TIMEOUT
    );
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

async function executeJava(code, tempDir, filepath) {
  const classMatch = code.match(/public\s+class\s+(\w+)/);
  if (!classMatch) {
    return { success: false, error: 'No public class found in Java code' };
  }
  
  const className = classMatch[1];
  const javaFile = path.join(tempDir, `${className}.java`);
  
  await fs.writeFile(javaFile, code);

  const compileResult = await runCommand('javac', [javaFile], tempDir, TIMEOUT);
  if (!compileResult.success) {
    return compileResult;
  }

  return await runCommand('java', [className], tempDir, TIMEOUT);
}

function runCommand(cmd, args, cwd, timeout) {
  return new Promise((resolve) => {
    let timedOut = false;
    
    const proc = spawn(cmd, args, { 
      cwd, 
      shell: process.platform === 'win32',
      timeout 
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
      resolve({
        success: false,
        error: `Execution timeout (${timeout / 1000} seconds)`
      });
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      
      if (timedOut) return;

      if (code === 0) {
        resolve({
          success: true,
          output: stdout || 'Code executed successfully (no output)'
        });
      } else {
        resolve({
          success: false,
          error: stderr || stdout || `Process exited with code ${code}`
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      
      if (timedOut) return;

      let errorMsg = err.message;
      if (err.code === 'ENOENT') {
        errorMsg = `Command '${cmd}' not found. Please install ${cmd}.`;
      }
      
      resolve({
        success: false,
        error: errorMsg
      });
    });
  });
}

module.exports = { executeCode };