-- The original 60-second default is too short for a multi-paper Agent search.
-- Preserve any timeout the user has already customized.
UPDATE settings
SET value = '180000', updated_at = datetime('now')
WHERE key = 'piCliTimeout' AND value = '60000';
