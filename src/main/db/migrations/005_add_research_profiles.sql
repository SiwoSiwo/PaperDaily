-- Hierarchical research profiles and paper ownership.
CREATE TABLE IF NOT EXISTS research_directions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS research_questions (
  id                  TEXT PRIMARY KEY,
  direction_id        TEXT NOT NULL REFERENCES research_directions(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  domains_json        TEXT NOT NULL DEFAULT '[]',
  extra_requirements  TEXT NOT NULL DEFAULT '',
  prompt_override     TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_research_directions_sort
  ON research_directions(sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_research_questions_direction_sort
  ON research_questions(direction_id, sort_order, created_at);

-- Preserve the previous single research configuration as the first profile.
INSERT OR IGNORE INTO research_directions (id, name, sort_order)
VALUES (
  'legacy-default-direction',
  COALESCE(
    (SELECT json_extract(value, '$') FROM settings WHERE key = 'researchDirection'),
    '大语言模型安全'
  ),
  0
);

INSERT OR IGNORE INTO research_questions (
  id, direction_id, name, domains_json, extra_requirements, sort_order
)
VALUES (
  'legacy-default-question',
  'legacy-default-direction',
  COALESCE(
    (SELECT json_extract(value, '$') FROM settings WHERE key = 'researchQuestions'),
    '如何提升 LLM 对抗攻击的鲁棒性'
  ),
  COALESCE(
    (SELECT value FROM settings WHERE key = 'domains'),
    '["cs.AI","cs.CL"]'
  ),
  COALESCE(
    (SELECT json_extract(value, '$') FROM settings WHERE key = 'extraRequirements'),
    ''
  ),
  0
);

ALTER TABLE papers ADD COLUMN research_direction_id TEXT
  REFERENCES research_directions(id) ON DELETE CASCADE;
ALTER TABLE papers ADD COLUMN research_question_id TEXT
  REFERENCES research_questions(id) ON DELETE CASCADE;

UPDATE papers
SET research_direction_id = 'legacy-default-direction',
    research_question_id = 'legacy-default-question'
WHERE research_direction_id IS NULL OR research_question_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_papers_research_direction
  ON papers(research_direction_id);
CREATE INDEX IF NOT EXISTS idx_papers_research_question
  ON papers(research_question_id);
