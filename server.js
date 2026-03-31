const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BANK_PATH = path.join(DATA_DIR, 'kntt-lop6-ontap-bank-v2.jsonl');
const ATTEMPT_PATH = path.join(DATA_DIR, 'attempt-results.jsonl');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function ensureAttemptFile() {
  if (!fs.existsSync(ATTEMPT_PATH)) {
    fs.writeFileSync(ATTEMPT_PATH, '', 'utf8');
  }
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function sanitizeQuestion(question) {
  const clone = JSON.parse(JSON.stringify(question));
  delete clone.correct_answer;
  delete clone.accepted_answers;
  return clone;
}

function shuffle(array) {
  const cloned = [...array];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
}

function pickQuestions(bank, count, subject) {
  const filtered = subject && subject !== 'all'
    ? bank.filter((item) => item.subject === subject)
    : bank;

  return shuffle(filtered).slice(0, Math.min(count, filtered.length));
}

function isCorrect(question, answer) {
  if (question.type === 'single_choice') {
    return normalizeText(answer) === normalizeText(question.correct_answer);
  }

  if (question.type === 'short_answer') {
    const accepted = question.accepted_answers || [question.correct_answer];
    return accepted.some((item) => normalizeText(item) === normalizeText(answer));
  }

  if (question.type === 'matching') {
    const expected = question.items.reduce((accumulator, item) => {
      accumulator[item.label] = item.correct_match;
      return accumulator;
    }, {});

    const actual = answer && typeof answer === 'object' ? answer : {};
    return Object.keys(expected).every((key) => normalizeText(actual[key]) === normalizeText(expected[key]));
  }

  if (question.type === 'ordering') {
    const expected = Array.isArray(question.correct_answer) ? question.correct_answer.map(String) : [];
    const actual = Array.isArray(answer) ? answer.map(String) : [];
    return expected.length === actual.length && expected.every((item, index) => item === actual[index]);
  }

  return false;
}

function gradeSubmission(bank, payload) {
  const answers = payload.answers || {};
  const selectedQuestions = Array.isArray(payload.questionNumbers) ? payload.questionNumbers : [];
  const lookup = new Map(bank.map((question) => [String(question.number), question]));

  const results = selectedQuestions
    .map((number) => {
      const question = lookup.get(String(number));
      if (!question) {
        return null;
      }

      const submittedAnswer = answers[String(number)];
      const correct = isCorrect(question, submittedAnswer);

      return {
        number: question.number,
        subject: question.subject,
        topic: question.topic,
        type: question.type,
        correct,
        submitted_answer: submittedAnswer ?? null,
        correct_answer: question.correct_answer
      };
    })
    .filter(Boolean);

  const total = results.length;
  const correctCount = results.filter((item) => item.correct).length;
  const percentage = total > 0 ? Number(((correctCount / total) * 100).toFixed(2)) : 0;
  const score10 = total > 0 ? Number(((correctCount / total) * 10).toFixed(2)) : 0;

  return {
    student_name: payload.studentName ? String(payload.studentName).trim() : '',
    submitted_at: new Date().toISOString(),
    total_questions: total,
    correct_count: correctCount,
    wrong_count: total - correctCount,
    percentage,
    score10,
    results
  };
}

function appendAttempt(attempt) {
  ensureAttemptFile();
  fs.appendFileSync(ATTEMPT_PATH, `${JSON.stringify(attempt)}\n`, 'utf8');
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

function serveStaticFile(requestPath, response) {
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(response, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(response, 404, { error: 'Not found' });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' });
    response.end(data);
  });
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://localhost:${PORT}`);
  const pathname = requestUrl.pathname;
  const bank = readJsonl(BANK_PATH);

  if (request.method === 'GET' && pathname === '/api/meta') {
    const subjects = [...new Set(bank.map((item) => item.subject))];
    sendJson(response, 200, {
      total_questions: bank.length,
      subjects
    });
    return;
  }

  if (request.method === 'GET' && pathname === '/api/questions') {
    const count = Number(requestUrl.searchParams.get('count') || 20);
    const subject = requestUrl.searchParams.get('subject') || 'all';
    const questions = pickQuestions(bank, count, subject).map(sanitizeQuestion);
    sendJson(response, 200, { questions });
    return;
  }

  if (request.method === 'GET' && pathname === '/api/history') {
    const history = readJsonl(ATTEMPT_PATH)
      .slice(-20)
      .reverse()
      .map((item, index) => ({
        id: index + 1,
        student_name: item.student_name,
        submitted_at: item.submitted_at,
        total_questions: item.total_questions,
        correct_count: item.correct_count,
        percentage: item.percentage,
        score10: item.score10
      }));
    sendJson(response, 200, { history });
    return;
  }

  if (request.method === 'POST' && pathname === '/api/submit') {
    try {
      const rawBody = await readRequestBody(request);
      const payload = rawBody ? JSON.parse(rawBody) : {};
      const graded = gradeSubmission(bank, payload);
      appendAttempt(graded);
      sendJson(response, 200, graded);
    } catch (error) {
      sendJson(response, 400, { error: 'Invalid submission payload.' });
    }
    return;
  }

  if (request.method === 'GET') {
    serveStaticFile(pathname, response);
    return;
  }

  sendJson(response, 405, { error: 'Method not allowed' });
});

ensureAttemptFile();

server.listen(PORT, () => {
  console.log(`Quiz app is running at http://localhost:${PORT}`);
});
