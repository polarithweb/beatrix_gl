import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeText,
  sanitizeSlug,
  isValidImageUrlOrDataUri,
  getMinWithdrawalInCurrency,
  MIN_WITHDRAWAL_INR,
} from '../src/types';

describe('Marketplace Security & Validation Utilities', () => {
  it('strips HTML angle brackets and trims/caps text to prevent XSS', () => {
    const dirty = '  <script>alert("xss")</script>Hello World  ';
    const cleaned = sanitizeText(dirty, 50);
    assert.equal(cleaned.includes('<'), false);
    assert.equal(cleaned.includes('>'), false);
    assert.equal(cleaned, 'scriptalert("xss")/scriptHello World');
  });

  it('generates URL-safe lowercase slugs', () => {
    assert.equal(sanitizeSlug('Grand Theft Auto 5'), 'grand-theft-auto-5');
    assert.equal(sanitizeSlug('PlayerUnknown\'s Battlegrounds'), 'playerunknowns-battlegrounds');
    assert.equal(sanitizeSlug('   !!!   '), 'item');
  });

  it('rejects javascript: and invalid URLs while allowing https, relative paths, and image data URIs', () => {
    assert.equal(isValidImageUrlOrDataUri('https://example.com/img.png'), true);
    assert.equal(isValidImageUrlOrDataUri('/assets/banner.jpg'), true);
    assert.equal(isValidImageUrlOrDataUri('data:image/jpeg;base64,/9j/4AAQ'), true);
    assert.equal(isValidImageUrlOrDataUri(''), true);
    assert.equal(isValidImageUrlOrDataUri('javascript:alert(1)'), false);
    assert.equal(isValidImageUrlOrDataUri('data:text/html,<script>'), false);
  });

  it('calculates minimum withdrawal limit accurately across currencies', () => {
    assert.equal(getMinWithdrawalInCurrency('INR'), MIN_WITHDRAWAL_INR);
    const usdMin = getMinWithdrawalInCurrency('USD');
    assert.ok(usdMin > 10 && usdMin < 15);
  });
});

describe('Games Catalogue & Top 20 Integrity', () => {
  it('includes all game titles from CSV with empty iconUrl and bannerUrl on catalogue entries', () => {
    const catalogueSource = fs.readFileSync(
      path.resolve('src/data/gamesCatalogue.ts'),
      'utf-8'
    );
    const csvSource = fs.readFileSync(
      path.resolve('public/assets/aistudio/eldorado_games_catalogue_4c3fad1b.csv'),
      'utf-8'
    );

    const csvTitles = csvSource
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean);

    assert.equal(csvTitles.length, 338);
    assert.match(catalogueSource, /iconUrl:\s*''/);
    assert.match(catalogueSource, /bannerUrl:\s*''/);
    assert.match(catalogueSource, /featured:\s*false/);
    for (const title of csvTitles.slice(0, 10)) {
      const escaped = title.replace(/'/g, "\\'");
      assert.ok(
        catalogueSource.includes(`'${escaped}'`),
        `Expected catalogue to include ${title}`
      );
    }
  });

  it('defines 20 prominent games for the swipeable showcase', () => {
    const catalogueSource = fs.readFileSync(
      path.resolve('src/data/gamesCatalogue.ts'),
      'utf-8'
    );
    const idMatches = catalogueSource.match(/imageUrl:\s*[a-zA-Z0-9_]+,/g) || [];
    assert.equal(idMatches.length, 20);
  });
});
