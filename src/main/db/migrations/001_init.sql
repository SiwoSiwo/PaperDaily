-- ========== PaperDaily 数据库初始化 ==========

-- 论文表
CREATE TABLE IF NOT EXISTS papers (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  url           TEXT NOT NULL,
  date          TEXT NOT NULL,
  summary       TEXT,
  category      TEXT NOT NULL CHECK(category IN ('new', 'old', 'intensive')),
  match_score   REAL,
  match_reason  TEXT,
  is_intensive  INTEGER DEFAULT 0,
  is_finished   INTEGER DEFAULT 0,
  push_date     TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_papers_push_date ON papers(push_date);
CREATE INDEX IF NOT EXISTS idx_papers_category ON papers(category);
CREATE INDEX IF NOT EXISTS idx_papers_is_intensive ON papers(is_intensive);

-- 复习计划表
CREATE TABLE IF NOT EXISTS review_schedule (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id      TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  review_date   TEXT NOT NULL,
  is_done       INTEGER DEFAULT 0,
  interval_day  INTEGER NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_review_date ON review_schedule(review_date);
CREATE INDEX IF NOT EXISTS idx_review_paper ON review_schedule(paper_id);

-- 用户配置表
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- 插入默认设置
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('researchDirection', '"大语言模型安全"'),
  ('researchQuestions', '"如何提升 LLM 对抗攻击的鲁棒性"'),
  ('domains', '["cs.AI","cs.CL"]'),
  ('newCount', '5'),
  ('oldCount', '3'),
  ('intensiveCount', '2'),
  ('extraRequirements', '""'),
  ('dateThreshold', '"2025-01-01"'),
  ('reviewIntervals', '[1,2,4,7,15,30]'),
  ('reviewCount', '3'),
  ('piCliPath', '"pi"'),
  ('piCliTimeout', '180000'),
  ('piProvider', '"cc-switch-deep-seek"'),
  ('piModel', '"deepseek-flash"'),
  ('theme', '"light"');
