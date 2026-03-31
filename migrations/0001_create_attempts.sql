CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_name TEXT NOT NULL DEFAULT '',
  subject_filter TEXT NOT NULL DEFAULT 'all',
  submitted_at TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  percentage REAL NOT NULL,
  score10 REAL NOT NULL,
  question_numbers_json TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  results_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_submitted_at
ON attempts(submitted_at DESC);
