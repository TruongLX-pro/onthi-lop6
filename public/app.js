const state = {
  questions: []
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
      <div class="option-item">
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
      <div class="match-row">
        <div><strong>${index + 1}.</strong> ${escapeHtml(item.label)}</div>
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
      <div class="order-row">
        <div>${escapeHtml(item.text)}</div>
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
    <article class="question-card">
      <div class="question-meta">
        Câu ${index + 1} • Lớp ${escapeHtml(question.grade)} • ${escapeHtml(question.subject)} • ${escapeHtml(question.topic)}
      </div>
      <div class="question-title">${escapeHtml(question.question)}</div>
      ${question.passage ? `<div class="passage">${escapeHtml(question.passage)}</div>` : ''}
      ${answerHtml}
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

    renderResult(result);
    await loadHistory();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
