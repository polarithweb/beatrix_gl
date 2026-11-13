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
  FIELD_LIMITS,
  DEFAULT_BRAND_LOGO_PATH,
} from '../src/types';

describe('Marketplace Security & Validation Utilities', () => {
  it('strips HTML angle brackets and trims/caps text to prevent XSS', () => {
    const dirty = '  <script>alert("xss")</script>Hello World  ';
    const cleaned = sanitizeText(dirty, 50);
    assert.equal(cleaned.includes('<'), false);
    assert.equal(cleaned.includes('>'), false);
    assert.equal(cleaned, 'scriptalert("xss")/scriptHello World');
  });

  it('caps buyer-seller chat messages at FIELD_LIMITS.CHAT_MESSAGE_MAX and previews at CONVERSATION_PREVIEW_MAX', () => {
    assert.equal(FIELD_LIMITS.CHAT_MESSAGE_MAX, 1000);
    assert.equal(FIELD_LIMITS.CONVERSATION_PREVIEW_MAX, 500);
    const oversized = '<img src=x onerror=alert(1)>' + 'a'.repeat(1500);
    const sanitized = sanitizeText(oversized, FIELD_LIMITS.CHAT_MESSAGE_MAX);
    assert.equal(sanitized.length, FIELD_LIMITS.CHAT_MESSAGE_MAX);
    assert.equal(sanitized.includes('<'), false);
    assert.equal(sanitized.includes('>'), false);
  });

  it('generates URL-safe lowercase slugs', () => {
    assert.equal(sanitizeSlug('Grand Theft Auto 5'), 'grand-theft-auto-5');
    assert.equal(sanitizeSlug('PlayerUnknown\'s Battlegrounds'), 'playerunknowns-battlegrounds');
    assert.equal(sanitizeSlug('   !!!   '), 'item');
  });

  it('rejects javascript: and invalid URLs while allowing https, relative paths, and image data URIs', () => {
    assert.equal(isValidImageUrlOrDataUri('https://example.com/img.png'), true);
    assert.equal(isValidImageUrlOrDataUri('/assets/banner.jpg'), true);
    assert.equal(isValidImageUrlOrDataUri(`./${DEFAULT_BRAND_LOGO_PATH}`), true);
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
  it('includes all CSV game titles, the full GTA series, and 100% verified logo coverage', async () => {
    const { GAME_LOGOS } = await import('../src/data/gameLogos');
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

    const rawTitlesBlock =
      catalogueSource.split('export const RAW_CATALOGUE_TITLES: string[] = [')[1]?.split('];')[0] ||
      '';
    const catalogueTitles = [...rawTitlesBlock.matchAll(/^\s*'((?:[^'\\\r\n]|\\.)+)',$/gm)].map(
      (match) => match[1].replace(/\\'/g, "'")
    );

    const titleToSlug = (title: string): string =>
      title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const gtaSeriesTitles = [
      'Grand Theft Auto',
      'Grand Theft Auto 2',
      'Grand Theft Auto 5',
      'Grand Theft Auto Advance',
      'Grand Theft Auto III',
      'Grand Theft Auto IV',
      'Grand Theft Auto IV: The Lost and Damned',
      'Grand Theft Auto Online',
      'Grand Theft Auto VI',
      'Grand Theft Auto: Chinatown Wars',
      'Grand Theft Auto: Episodes from Liberty City',
      'Grand Theft Auto: Liberty City Stories',
      'Grand Theft Auto: London 1961',
      'Grand Theft Auto: London 1969',
      'Grand Theft Auto: San Andreas',
      'Grand Theft Auto: The Ballad of Gay Tony',
      'Grand Theft Auto: The Trilogy - The Definitive Edition',
      'Grand Theft Auto: Vice City',
      'Grand Theft Auto: Vice City Stories',
    ];

    const top20Section =
      catalogueSource.split('export const TOP_20_PROMINENT_GAMES')[1]?.split('];')[0] || '';
    const top20Slugs = [...top20Section.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);

    assert.equal(csvTitles.length, 338);
    assert.equal(catalogueTitles.length, 356);
    assert.equal(top20Slugs.length, 20);
    assert.match(catalogueSource, /iconUrl:\s*GAME_LOGOS\[slug\]\s*\|\|\s*''/);
    assert.match(catalogueSource, /bannerUrl:\s*''/);
    assert.match(catalogueSource, /featured:\s*false/);
    for (const [slug, url] of Object.entries(GAME_LOGOS)) {
      assert.match(slug, /^[a-z0-9-]+$/);
      assert.match(url, /^https:\/\//);
    }
    for (const slug of top20Slugs) {
      assert.ok(
        Boolean(GAME_LOGOS[slug]),
        `Expected verified logo for Top 20 game ${slug}`
      );
    }
    for (const title of csvTitles) {
      assert.ok(
        catalogueTitles.includes(title),
        `Expected catalogue to include CSV title ${title}`
      );
    }
    for (const gtaTitle of gtaSeriesTitles) {
      assert.ok(
        catalogueTitles.includes(gtaTitle),
        `Expected catalogue to include GTA series title ${gtaTitle}`
      );
    }
    for (const title of catalogueTitles) {
      const slug = titleToSlug(title);
      const logoUrl = GAME_LOGOS[slug];
      assert.ok(
        Boolean(logoUrl) && logoUrl.startsWith('https://'),
        `Expected verified https logo for catalogue game ${title} (${slug})`
      );
    }
  });

  it('defines 20 prominent games for the swipeable showcase with 20 unique non-repeating images', () => {
    const catalogueSource = fs.readFileSync(
      path.resolve('src/data/gamesCatalogue.ts'),
      'utf-8'
    );
    const idMatches = catalogueSource.match(/imageUrl:\s*([a-zA-Z0-9_]+),/g) || [];
    assert.equal(idMatches.length, 20);
    const uniqueImageRefs = new Set(idMatches.map((m) => m.trim()));
    assert.equal(uniqueImageRefs.size, 20);
  });
});

describe('Seller Studio & Buyer-Seller Chat Integration', () => {
  it('registers /seller and /chat routes in App.tsx and navigation entries in Navbar.tsx', () => {
    const appSource = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
    const navbarSource = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf-8');

    assert.match(appSource, /path="\/seller"\s+element=\{<SellerDashboardPage\s*\/>\}/);
    assert.match(appSource, /path="\/chat"\s+element=\{<ChatPage\s*\/>\}/);
    assert.match(navbarSource, /to="\/chat"/);
    assert.match(navbarSource, /to="\/seller"/);
  });

  it('enforces seller ownership and chat isolation in firestore.rules', () => {
    const rulesSource = fs.readFileSync(path.resolve('firestore.rules'), 'utf-8');

    assert.match(rulesSource, /function isActiveSeller\(\)/);
    assert.match(rulesSource, /match \/conversations\/\{conversationId\}/);
    assert.match(rulesSource, /match \/messages\/\{messageId\}/);
    assert.match(rulesSource, /incoming\(\)\.sellerUid == request\.auth\.uid/);
    assert.match(rulesSource, /existing\(\)\.sellerUid == request\.auth\.uid/);
  });
});

describe('Deployment & GitHub Actions Readiness', () => {
  it('configures .github/workflows/deploy.yml with full verification gates and ERESOLVE-safe install', () => {
    const workflow = fs.readFileSync(
      path.resolve('.github/workflows/deploy.yml'),
      'utf-8'
    );
    const rulesWorkflow = fs.readFileSync(
      path.resolve('.github/workflows/firebase-rules.yml'),
      'utf-8'
    );
    const npmrc = fs.readFileSync(path.resolve('.npmrc'), 'utf-8');

    assert.match(npmrc, /legacy-peer-deps=true/);
    assert.equal(workflow.includes('cache: "npm"'), false);
    assert.match(workflow, /--legacy-peer-deps/);
    assert.match(rulesWorkflow, /--legacy-peer-deps/);
    assert.match(workflow, /enablement:\s*true/);
    assert.match(workflow, /npm run lint\b/);
    assert.match(workflow, /npm run lint:rules\b/);
    assert.match(workflow, /npm test\b/);
    assert.match(workflow, /npm run build\b/);
    assert.match(workflow, /actions\/deploy-pages@v4/);
  });

  it('uses HashRouter and BASE_URL-relative public asset paths across App, Navbar, Footer, and index.html', () => {
    const appSource = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
    const navbarSource = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf-8');
    const footerSource = fs.readFileSync(path.resolve('src/components/Footer.tsx'), 'utf-8');
    const indexHtmlSource = fs.readFileSync(path.resolve('index.html'), 'utf-8');

    assert.match(appSource, /HashRouter/);
    assert.match(appSource, /import\.meta\.env\.BASE_URL/);
    assert.equal(appSource.includes('src="/assets/'), false);

    assert.equal(DEFAULT_BRAND_LOGO_PATH, 'assets/aistudio/IMG_20261113_114213_0165f38a.jpg');
    assert.equal(fs.existsSync(path.resolve('public', DEFAULT_BRAND_LOGO_PATH)), true);
    assert.match(navbarSource, /DEFAULT_BRAND_LOGO_PATH/);
    assert.match(navbarSource, /import\.meta\.env\.BASE_URL/);
    assert.match(navbarSource, /<header\s+className="bg-black\b/);
    assert.equal(navbarSource.includes('src="/assets/'), false);
    assert.match(footerSource, /DEFAULT_BRAND_LOGO_PATH/);
    assert.match(footerSource, /import\.meta\.env\.BASE_URL/);
    assert.equal(footerSource.includes('src="/assets/'), false);
    assert.match(indexHtmlSource, /\.\/assets\/aistudio\/IMG_20261113_114213_0165f38a\.jpg/);
  });

  it('binds firebase.json to the provisioned named Firestore database', () => {
    const firebaseJson = JSON.parse(
      fs.readFileSync(path.resolve('firebase.json'), 'utf-8')
    );
    const appletConfig = JSON.parse(
      fs.readFileSync(path.resolve('firebase-applet-config.json'), 'utf-8')
    );
    assert.equal(firebaseJson.firestore.database, appletConfig.firestoreDatabaseId);
    assert.equal(firebaseJson.firestore.rules, 'firestore.rules');
    assert.equal(firebaseJson.hosting.public, 'dist');
  });

  it('defines black-box storefront theme utilities with white typography across pages', () => {
    const indexCss = fs.readFileSync(path.resolve('src/index.css'), 'utf-8');
    const homeSource = fs.readFileSync(path.resolve('src/pages/HomePage.tsx'), 'utf-8');
    const footerSource = fs.readFileSync(path.resolve('src/components/Footer.tsx'), 'utf-8');
    const navbarSource = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf-8');
    const sellerSource = fs.readFileSync(path.resolve('src/pages/SellerDashboardPage.tsx'), 'utf-8');
    const walletSource = fs.readFileSync(path.resolve('src/pages/WalletPage.tsx'), 'utf-8');
    const chatSource = fs.readFileSync(path.resolve('src/pages/ChatPage.tsx'), 'utf-8');

    assert.match(indexCss, /\.black-box\s*\{/);
    assert.match(indexCss, /\.black-box-strong\s*\{/);
    assert.match(indexCss, /\.black-subbox\s*\{/);
    assert.match(indexCss, /\.black-input\s*\{/);
    assert.match(homeSource, /black-box-strong/);
    assert.match(homeSource, /black-box\b/);
    assert.match(footerSource, /<footer\s+className="bg-black text-white/);
    assert.match(navbarSource, /className="relative w-full max-w-md bg-black text-white/);
    assert.match(sellerSource, /black-box-strong/);
    assert.match(walletSource, /black-box-strong/);
    assert.match(chatSource, /black-box-strong/);
  });
});

