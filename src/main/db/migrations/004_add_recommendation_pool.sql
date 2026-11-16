-- Separate the reusable paper library from the daily recommendation history.
CREATE TABLE IF NOT EXISTS paper_recommendations (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id             TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  recommendation_date  TEXT NOT NULL,
  created_at           TEXT DEFAULT (datetime('now')),
  UNIQUE(paper_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_date
  ON paper_recommendations(recommendation_date);

-- Existing rows were already shown to the user. Preserve them as history so
-- they are not accidentally selected again after this migration.
INSERT OR IGNORE INTO paper_recommendations (paper_id, recommendation_date)
SELECT id, push_date FROM papers;
