import questionBank from './question-bank.mjs';

const DEFAULT_COUNT = 20;
const MAX_COUNT = 60;
const HISTORY_LIMIT = 20;

const questionLookup = new Map(questionBank.map((question) => [String(question.number), question]));
const subjectList = [...new Set(questionBank.map((question) => question.subject))];

function json(data, init = {}) {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'no-store'
    },
    ...init
  });
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function sanitizeQuestion(question) {
  const clone = structuredClone(question);
  delete clone.correct_answer;
  delete clone.accepted_answers;

  if (Array.isArray(clone.items)) {
    clone.items = clone.items.map(({ label }) => ({ label }));
  }

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

function clampCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_COUNT;
  }
  return Math.min(parsed, MAX_COUNT, questionBank.length);
}

function pickQuestions(count, subject) {
  const filtered = subject && subject !== 'all'
    ? questionBank.filter((item) => item.subject === subject)
    : questionBank;

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
    return Object.keys(expected).every(
      (key) => normalizeText(actual[key]) === normalizeText(expected[key])
    );
  }

  if (question.type === 'ordering') {
    const expected = Array.isArray(question.correct_answer)
      ? question.correct_answer.map(String)
      : [];
    const actual = Array.isArray(answer) ? answer.map(String) : [];

    return expected.length === actual.length && expected.every((item, index) => item === actual[index]);
  }

  return false;
}

function gradeSubmission(payload) {
  const answers = payload.answers || {};
  const selectedQuestions = Array.isArray(payload.questionNumbers) ? payload.questionNumbers : [];

  const results = selectedQuestions
    .map((number) => {
      const question = questionLookup.get(String(number));
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
    subject_filter: payload.subjectFilter ? String(payload.subjectFilter) : 'all',
    submitted_at: new Date().toISOString(),
    total_questions: total,
    correct_count: correctCount,
    wrong_count: total - correctCount,
    percentage,
    score10,
    answers,
    question_numbers: selectedQuestions.map(String),
    results
  };
}

async function readHistory(db) {
  const query = db.prepare(`
    SELECT
      id,
      student_name,
      subject_filter,
      submitted_at,
      total_questions,
      correct_count,
      wrong_count,
      percentage,
      score10
    FROM attempts
    ORDER BY submitted_at DESC
    LIMIT ?
  `);

  const response = await query.bind(HISTORY_LIMIT).all();
  return response.results || [];
}

async function saveAttempt(db, attempt) {
  const insert = db.prepare(`
    INSERT INTO attempts (
      student_name,
      subject_filter,
      submitted_at,
      total_questions,
      correct_count,
      wrong_count,
      percentage,
      score10,
      question_numbers_json,
      answers_json,
      results_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return insert
    .bind(
      attempt.student_name,
      attempt.subject_filter,
      attempt.submitted_at,
      attempt.total_questions,
      attempt.correct_count,
      attempt.wrong_count,
      attempt.percentage,
      attempt.score10,
      JSON.stringify(attempt.question_numbers),
      JSON.stringify(attempt.answers),
      JSON.stringify(attempt.results)
    )
    .run();
}

async function handleApi(request, env, url) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'GET, POST, OPTIONS'
      }
    });
  }

  if (request.method === 'GET' && url.pathname === '/api/meta') {
    return json({
      total_questions: questionBank.length,
      subjects: subjectList
    });
  }

  if (request.method === 'GET' && url.pathname === '/api/questions') {
    const count = clampCount(url.searchParams.get('count'));
    const subject = url.searchParams.get('subject') || 'all';
    const questions = pickQuestions(count, subject).map(sanitizeQuestion);
    return json({ questions });
  }

  if (request.method === 'GET' && url.pathname === '/api/history') {
    try {
      const history = await readHistory(env.DB);
      return json({ history });
    } catch (error) {
      return json({
        history: [],
        warning: 'Chưa đọc được lịch sử làm bài. Hãy kiểm tra cấu hình D1 và migration.'
      });
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/submit') {
    try {
      const payload = await request.json();
      const graded = gradeSubmission(payload);

      try {
        await saveAttempt(env.DB, graded);
        return json({ ...graded, saved: true });
      } catch (error) {
        return json({
          ...graded,
          saved: false,
          storage_warning: 'Đã chấm bài nhưng chưa lưu được lịch sử. Hãy chạy migration D1 trước.'
        });
      }
    } catch (error) {
      return json({ error: 'Dữ liệu bài nộp chưa hợp lệ.' }, { status: 400 });
    }
  }

  return json({ error: 'Không tìm thấy API.' }, { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }

    return env.ASSETS.fetch(request);
  }
};
