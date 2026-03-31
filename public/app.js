const state = {
  questions: [],
  resultsByNumber: new Map()
};

const elements = {
  studentName: document.getElementById('studentName'),
  subjectSelect: document.getElementById('subjectSelect'),
  countSelect: document.getElementById('countSelect'),
  startBtn: document.getElementById('startBtn'),
  submitBtn: document.getElementById('submitBtn'),
  quizForm: document.getElementById('quizForm'),
  resultSection: document.getElementById('resultSection'),
  historyList: document.getElementById('historyList'),
  refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
  metaSummary: document.getElementById('metaSummary'),
  questionCountText: document.getElementById('questionCountText')
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function clearQuestionFeedback() {
  state.resultsByNumber = new Map();
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

async function loadMeta() {
  const data = await fetchJson('/api/meta');
  elements.metaSummary.textContent = `Ngân hàng hiện có ${data.total_questions} câu hỏi.`;

  const options = ['<option value="all">Tất cả môn</option>']
    .concat(data.subjects.map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`));

  elements.subjectSelect.innerHTML = options.join('');
}

function renderSingleChoice(question) {
  const options = Object.entries(question.options || {})
    .map(([key, value]) => `
      <div class="option-item" data-option-value="${escapeHtml(key)}">
        <label>
          <input type="radio" name="q-${question.number}" value="${escapeHtml(key)}" />
          <span><strong>${escapeHtml(key)}.</strong> ${escapeHtml(value)}</span>
        </label>
      </div>
    `)
    .join('');

  return `<div class="option-list">${options}</div>`;
}

function renderShortAnswer(question) {
  return `<input type="text" name="q-${question.number}" placeholder="Nhập đáp án của em" />`;
}

function renderMatching(question) {
  const pool = question.option_pool || [];
  return (question.items || [])
    .map((item, index) => `
      <div class="match-row" data-match-row="${escapeHtml(item.label)}">
        <div>
          <strong>${index + 1}.</strong> ${escapeHtml(item.label)}
          <div class="row-feedback"></div>
        </div>
        <select data-match-label="${escapeHtml(item.label)}" name="q-${question.number}">
          <option value="">Chọn đáp án</option>
          ${pool.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}
        </select>
      </div>
    `)
    .join('');
}

function renderOrdering(question) {
  const max = (question.sentences || []).length;
  const orderChoices = Array.from({ length: max }, (_, index) => index + 1);

  return (question.sentences || [])
    .map((item) => `
      <div class="order-row" data-order-row="${item.original_index}">
        <div>
          ${escapeHtml(item.text)}
          <div class="row-feedback"></div>
        </div>
        <select data-order-index="${item.original_index}" name="q-${question.number}">
          <option value="">Chọn thứ tự</option>
          ${orderChoices.map((choice) => `<option value="${choice}">${choice}</option>`).join('')}
        </select>
      </div>
    `)
    .join('');
}

function renderQuestion(question, index) {
  let answerHtml = '';

  if (question.type === 'single_choice') {
    answerHtml = renderSingleChoice(question);
  } else if (question.type === 'short_answer') {
    answerHtml = renderShortAnswer(question);
  } else if (question.type === 'matching') {
    answerHtml = renderMatching(question);
  } else if (question.type === 'ordering') {
    answerHtml = renderOrdering(question);
  }

  return `
    <article class="question-card" data-question-number="${question.number}" data-question-type="${escapeHtml(question.type)}">
      <div class="question-meta">
        Câu ${index + 1} • Lớp ${escapeHtml(question.grade)} • ${escapeHtml(question.subject)} • ${escapeHtml(question.topic)}
      </div>
      <div class="question-title">${escapeHtml(question.question)}</div>
      ${question.passage ? `<div class="passage">${escapeHtml(question.passage)}</div>` : ''}
      ${answerHtml}
      <div class="question-feedback"></div>
    </article>
  `;
}

function renderQuestions() {
  elements.quizForm.innerHTML = state.questions.map(renderQuestion).join('');
  elements.questionCountText.textContent = `${state.questions.length} câu`;
  elements.submitBtn.disabled = state.questions.length === 0;
  elements.resultSection.classList.add('hidden');
}

function buildAnswers() {
  const answers = {};

  for (const question of state.questions) {
    if (question.type === 'single_choice') {
      const input = elements.quizForm.querySelector(`[name="q-${question.number}"]:checked`);
      answers[String(question.number)] = input ? input.value : '';
      continue;
    }

    if (question.type === 'short_answer') {
      const input = elements.quizForm.querySelector(`input[name="q-${question.number}"]`);
      answers[String(question.number)] = input ? input.value : '';
      continue;
    }

    if (question.type === 'matching') {
      const selects = [...elements.quizForm.querySelectorAll(`select[name="q-${question.number}"][data-match-label]`)];
      answers[String(question.number)] = selects.reduce((accumulator, select) => {
        accumulator[select.dataset.matchLabel] = select.value;
        return accumulator;
      }, {});
      continue;
    }

    if (question.type === 'ordering') {
      const selects = [...elements.quizForm.querySelectorAll(`select[name="q-${question.number}"][data-order-index]`)];
      const ordered = selects
        .map((select) => ({
          sentenceIndex: Number(select.dataset.orderIndex),
          order: Number(select.value)
        }))
        .filter((item) => item.order > 0)
        .sort((a, b) => a.order - b.order)
        .map((item) => item.sentenceIndex);
      answers[String(question.number)] = ordered;
    }
  }

  return answers;
}

function formatCorrectAnswer(result) {
  if (result.type === 'single_choice') {
    return `Đáp án đúng: ${escapeHtml(result.correct_answer)}`;
  }

  if (result.type === 'short_answer') {
    return `Đáp án đúng: ${escapeHtml(result.correct_answer)}`;
  }

  if (result.type === 'matching') {
    return Object.entries(result.correct_answer || {})
      .map(([label, answer]) => `${escapeHtml(label)} → ${escapeHtml(answer)}`)
      .join(' • ');
  }

  if (result.type === 'ordering') {
    return `Thứ tự đúng: ${(result.correct_answer || []).join(' - ')}`;
  }

  return '';
}

function setQuestionFeedback(card, html, correct) {
  const feedback = card.querySelector('.question-feedback');
  feedback.innerHTML = html;
  feedback.className = `question-feedback ${correct ? 'feedback-correct' : 'feedback-wrong'}`;
}

function applySingleChoiceFeedback(card, result) {
  const selectedValue = String(result.submitted_answer || '');
  const correctValue = String(result.correct_answer || '');
  const inputs = [...card.querySelectorAll('input[type="radio"]')];

  inputs.forEach((input) => {
    input.disabled = true;
    const option = input.closest('.option-item');
    option.classList.remove('option-correct', 'option-wrong');

    if (input.value === correctValue) {
      option.classList.add('option-correct');
    }

    if (input.checked && input.value !== correctValue) {
      option.classList.add('option-wrong');
    }
  });

  if (result.correct) {
    setQuestionFeedback(card, 'Em đã làm đúng câu này.', true);
  } else {
    const selectedText = selectedValue ? `Em đã chọn: ${escapeHtml(selectedValue)}.` : 'Em chưa chọn đáp án.';
    setQuestionFeedback(card, `${selectedText} <span class="answer-note">Đáp án đúng là ${escapeHtml(correctValue)}.</span>`, false);
  }
}

function applyShortAnswerFeedback(card, result) {
  const input = card.querySelector('input[type="text"]');
  if (!input) {
    return;
  }

  input.disabled = true;
  input.classList.remove('input-correct', 'input-wrong');
  input.classList.add(result.correct ? 'input-correct' : 'input-wrong');

  if (result.correct) {
    setQuestionFeedback(card, 'Em đã điền đúng đáp án.', true);
  } else {
    const submittedText = normalizeText(result.submitted_answer)
      ? `Em đã điền: ${escapeHtml(result.submitted_answer)}.`
      : 'Em chưa điền đáp án.';
    setQuestionFeedback(card, `${submittedText} <span class="answer-note">Đáp án đúng: ${escapeHtml(result.correct_answer)}.</span>`, false);
  }
}

function applyMatchingFeedback(card, result) {
  const submitted = result.submitted_answer || {};
  const expected = result.correct_answer || {};
  const rows = [...card.querySelectorAll('[data-match-row]')];

  rows.forEach((row) => {
    const label = row.dataset.matchRow;
    const select = row.querySelector('select');
    const feedback = row.querySelector('.row-feedback');
    const isRowCorrect = normalizeText(submitted[label]) === normalizeText(expected[label]);

    row.classList.remove('row-correct', 'row-wrong');
    row.classList.add(isRowCorrect ? 'row-correct' : 'row-wrong');
    if (select) {
      select.disabled = true;
    }

    feedback.innerHTML = isRowCorrect
      ? '<span class="feedback-correct">Đúng</span>'
      : `<span class="feedback-wrong">Sai</span> <span class="answer-note">Đáp án đúng: ${escapeHtml(expected[label] || '')}</span>`;
  });

  setQuestionFeedback(
    card,
    result.correct
      ? 'Em đã ghép đúng toàn bộ.'
      : `<span class="answer-note">Gợi ý đúng: ${formatCorrectAnswer(result)}</span>`,
    result.correct
  );
}

function applyOrderingFeedback(card, result) {
  const submitted = Array.isArray(result.submitted_answer) ? result.submitted_answer.map(Number) : [];
  const expected = Array.isArray(result.correct_answer) ? result.correct_answer.map(Number) : [];
  const rows = [...card.querySelectorAll('[data-order-row]')];

  rows.forEach((row) => {
    const sentenceIndex = Number(row.dataset.orderRow);
    const select = row.querySelector('select');
    const feedback = row.querySelector('.row-feedback');
    const actualPosition = submitted.indexOf(sentenceIndex) + 1;
    const expectedPosition = expected.indexOf(sentenceIndex) + 1;
    const isRowCorrect = actualPosition > 0 && actualPosition === expectedPosition;

    row.classList.remove('row-correct', 'row-wrong');
    row.classList.add(isRowCorrect ? 'row-correct' : 'row-wrong');
    if (select) {
      select.disabled = true;
    }

    feedback.innerHTML = isRowCorrect
      ? `<span class="feedback-correct">Đúng ở vị trí ${expectedPosition}</span>`
      : `<span class="feedback-wrong">Sai</span> <span class="answer-note">Vị trí đúng: ${expectedPosition}</span>`;
  });

  setQuestionFeedback(
    card,
    result.correct
      ? 'Em đã sắp xếp đúng thứ tự.'
      : `<span class="answer-note">Thứ tự đúng là: ${(result.correct_answer || []).join(' - ')}</span>`,
    result.correct
  );
}

function applyQuestionResults() {
  const cards = [...elements.quizForm.querySelectorAll('[data-question-number]')];

  cards.forEach((card) => {
    const result = state.resultsByNumber.get(String(card.dataset.questionNumber));
    if (!result) {
      return;
    }

    card.classList.remove('is-correct', 'is-incorrect');
    card.classList.add(result.correct ? 'is-correct' : 'is-incorrect');

    if (result.type === 'single_choice') {
      applySingleChoiceFeedback(card, result);
      return;
    }

    if (result.type === 'short_answer') {
      applyShortAnswerFeedback(card, result);
      return;
    }

    if (result.type === 'matching') {
      applyMatchingFeedback(card, result);
      return;
    }

    if (result.type === 'ordering') {
      applyOrderingFeedback(card, result);
    }
  });
}

function renderResult(result) {
  const saveNote = result.saved === false
    ? `<p class="subtitle">${escapeHtml(result.storage_warning || 'Chưa lưu được lịch sử làm bài.')}</p>`
    : '<p class="subtitle">Kết quả đã được lưu vào D1.</p>';

  elements.resultSection.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Kết quả</h2>
        <p>${result.student_name ? `Học sinh: ${escapeHtml(result.student_name)}` : 'Chưa nhập tên học sinh'}</p>
      </div>
    </div>
    <div class="result-grid">
      <div class="result-box">
        Điểm
        <strong>${result.score10}</strong>
      </div>
      <div class="result-box good">
        Đúng
        <strong>${result.correct_count}</strong>
      </div>
      <div class="result-box bad">
        Sai
        <strong>${result.wrong_count}</strong>
      </div>
      <div class="result-box">
        Tỷ lệ đúng
        <strong>${result.percentage}%</strong>
      </div>
    </div>
    ${saveNote}
  `;
  elements.resultSection.classList.remove('hidden');
}

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleString('vi-VN');
  } catch {
    return isoString;
  }
}

async function loadHistory() {
  const data = await fetchJson('/api/history');
  if (!data.history.length) {
    elements.historyList.innerHTML = '<p>Chưa có lượt làm bài nào được ghi nhận.</p>';
    return;
  }

  elements.historyList.innerHTML = data.history
    .map((item) => `
      <div class="history-item">
        <div>${escapeHtml(item.student_name || 'Không tên')}</div>
        <div>${escapeHtml(item.subject_filter === 'all' ? 'Tất cả môn' : item.subject_filter)}</div>
        <div>${formatDate(item.submitted_at)}</div>
        <div>${item.correct_count}/${item.total_questions} đúng</div>
        <div>${item.percentage}% • Điểm ${item.score10}</div>
      </div>
    `)
    .join('');
}

async function startQuiz() {
  elements.startBtn.disabled = true;
  try {
    const subject = encodeURIComponent(elements.subjectSelect.value);
    const count = encodeURIComponent(elements.countSelect.value);
    const data = await fetchJson(`/api/questions?subject=${subject}&count=${count}`);
    state.questions = data.questions;
    clearQuestionFeedback();
    renderQuestions();
  } finally {
    elements.startBtn.disabled = false;
  }
}

async function submitQuiz() {
  if (!state.questions.length) {
    return;
  }

  elements.submitBtn.disabled = true;
  try {
    const payload = {
      studentName: elements.studentName.value,
      subjectFilter: elements.subjectSelect.value,
      questionNumbers: state.questions.map((question) => question.number),
      answers: buildAnswers()
    };

    const result = await fetchJson('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    state.resultsByNumber = new Map(result.results.map((item) => [String(item.number), item]));
    renderResult(result);
    applyQuestionResults();
    await loadHistory();
    elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } finally {
    elements.submitBtn.disabled = false;
  }
}

elements.startBtn.addEventListener('click', startQuiz);
elements.submitBtn.addEventListener('click', submitQuiz);
elements.refreshHistoryBtn.addEventListener('click', loadHistory);

Promise.all([loadMeta(), loadHistory()]).catch((error) => {
  elements.metaSummary.textContent = 'Không tải được dữ liệu ngân hàng câu hỏi.';
  elements.historyList.innerHTML = `<p>${escapeHtml(error.message || 'Không tải được lịch sử làm bài.')}</p>`;
});
