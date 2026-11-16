import test from 'node:test';
import assert from 'node:assert/strict';
import { ResultParser } from '../src/main/services/result-parser';

const paper = {
  category: 'new',
  title: 'Reliable paper parsing',
  date: '2026-11-15',
  url: 'https://example.com/paper',
  summary: 'A paper used to verify Agent response parsing.',
  matchScore: 0.9,
  matchReason: 'Relevant to the active research question.',
};

test('parses JSON from a Markdown code fence', () => {
  const parser = new ResultParser();
  const result = parser.parse(`\`\`\`json\n${JSON.stringify([paper])}\n\`\`\``);

  assert.equal(result.length, 1);
  assert.equal(result[0].title, paper.title);
});

test('parses paper JSON embedded in a Pi event payload', () => {
  const parser = new ResultParser();
  const response = JSON.stringify({
    type: 'message_end',
    message: {
      content: [{ type: 'text', text: JSON.stringify([paper]) }],
    },
  });

  const result = parser.parse(response);
  assert.equal(result.length, 1);
  assert.equal(result[0].url, paper.url);
});

test('normalizes trailing commas, aliases, categories and percent scores', () => {
  const parser = new ResultParser();
  const response = `[
    {
      "type": "精读推荐",
      "name": "Alias paper",
      "published_date": "2026-11-15",
      "link": "https://example.com/alias",
      "abstract": "Alias fields should remain parseable.",
      "score": "87%",
      "reason": "Strong match",
    },
  ]`;

  const result = parser.parse(response);
  assert.equal(result.length, 1);
  assert.equal(result[0].category, 'intensive');
  assert.equal(result[0].matchScore, 0.87);
});
