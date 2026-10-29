import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { grantReferralFirstUseReward } from "@/lib/market/referrals";

export const maxDuration = 60;

const FETCH_TIMEOUT_MS = 20000;
const MAX_RESULTS = 300;

type ScrapedRecord = {
  type: string;
  value: string;
  source: string;
  confidence: number;
};

const REQUEST_HEADER_PROFILES: HeadersInit[] = [
  {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Upgrade-Insecure-Requests': '1',
  },
];

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeEscapedText(value: string) {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/\\\//g, '/');
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, '');
}

function addResult(
  list: ScrapedRecord[],
  seen: Set<string>,
  record: ScrapedRecord,
) {
  const cleanValue = normalizeText(record.value);
  if (!cleanValue) return;
  const key = `${record.type}:${cleanValue.toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  list.push({ ...record, value: cleanValue });
}

function extractTextBlocks($: cheerio.CheerioAPI) {
  const blockCandidates = $('h1,h2,h3,h4,p,li,td,th,span')
    .map((_, elem) => normalizeText($(elem).text()))
    .get()
    .filter((line) => line.length >= 8);

  const unique = new Set<string>();
  const blocks: string[] = [];

  for (const line of blockCandidates) {
    const key = line.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    blocks.push(line);
    if (blocks.length >= 150) break;
  }

  return blocks;
}

function collectPageText($: cheerio.CheerioAPI) {
  const title = normalizeText($('title').text());
  const bodyText = normalizeText($('body').text());
  const metaText = $('meta[content]')
    .map((_, elem) => normalizeText($(elem).attr('content') || ''))
    .get()
    .filter(Boolean)
    .join(' ');
  const scriptRaw = $('script')
    .map((_, elem) => $(elem).html() || '')
    .get()
    .join('\n');
  const scriptText = normalizeText(decodeEscapedText(scriptRaw));
  const textBlocks = extractTextBlocks($);

  const combinedText = normalizeText(
    [title, bodyText, metaText, scriptText, textBlocks.join(' ')].filter(Boolean).join(' '),
  );

  return { title, bodyText, scriptText, textBlocks, combinedText };
}

async function fetchHtml(targetUrl: string) {
  let lastError = 'Unknown fetch error';

  for (const headers of REQUEST_HEADER_PROFILES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        headers,
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!response.ok) {
        lastError = `Failed to fetch page: ${response.status} ${response.statusText}`;
        continue;
      }

      const html = await response.text();
      if (html.trim().length < 80) {
        lastError = 'Fetched HTML is too short, possibly blocked by target site';
        continue;
      }

      return {
        html,
        finalUrl: response.url || targetUrl,
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        lastError = 'Request timeout while fetching target page';
      } else {
        lastError = `Fetch error: ${error?.message || 'Unknown error'}`;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(lastError);
}

function collectUrlCandidates(
  $: cheerio.CheerioAPI,
  combinedText: string,
  baseUrl: string,
) {
  const candidates = new Set<string>();

  $('a[href]').each((_, elem) => {
    const href = ($(elem).attr('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    candidates.add(href);
  });

  const canonical = normalizeText($('link[rel="canonical"]').attr('href') || '');
  if (canonical) candidates.add(canonical);

  const ogUrl = normalizeText($('meta[property="og:url"]').attr('content') || '');
  if (ogUrl) candidates.add(ogUrl);

  const textUrls = combinedText.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  textUrls.forEach((value) => candidates.add(value));

  const normalized = new Set<string>();
  candidates.forEach((item) => {
    try {
      const absolute = new URL(item, baseUrl).href;
      if (absolute.startsWith('http://') || absolute.startsWith('https://')) {
        normalized.add(absolute);
      }
    } catch {
      // Ignore invalid URL candidate
    }
  });

  return Array.from(normalized);
}

export async function POST(req: Request) {
  try {
    const requestUserId = String(req.headers.get("x-user-id") || "").trim();
    const body = await req.json();
    const url = String(body?.url || '').trim();
    const dataTypes = Array.isArray(body?.dataTypes) ? body.dataTypes : [];

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const { html, finalUrl } = await fetchHtml(url);
    const $ = cheerio.load(html);
    const { title, bodyText, textBlocks, combinedText } = collectPageText($);

    if (combinedText.length < 20) {
      return NextResponse.json(
        {
          error:
            'Target page did not expose enough readable text. It may require login, anti-bot verification, or JavaScript rendering.',
        },
        { status: 422 },
      );
    }

    const isLikelyAuthWall =
      /登录|登入|sign\s*in|log\s*in|verify|captcha|人机验证|访问受限/i.test(`${title} ${bodyText}`) &&
      textBlocks.length < 10;
    let warning: string | undefined;
    if (isLikelyAuthWall) {
      warning =
        'Target page may require login or anti-bot verification. Returned partial/visible data only.';
    }

    const results: ScrapedRecord[] = [];
    const seen = new Set<string>();

    if (dataTypes.includes('email')) {
      const normalized = combinedText
        .replace(/\[at\]|\(at\)/gi, '@')
        .replace(/\[dot\]|\(dot\)/gi, '.');
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = normalized.match(emailRegex) || [];
      emails.forEach((email) =>
        addResult(results, seen, {
          type: 'email',
          value: email,
          source: finalUrl,
          confidence: 90,
        }),
      );

      $('a[href^="mailto:"]').each((_, elem) => {
        const href = ($(elem).attr('href') || '').trim();
        const email = href.replace(/^mailto:/i, '').split('?')[0];
        addResult(results, seen, {
          type: 'email',
          value: email,
          source: finalUrl,
          confidence: 99,
        });
      });
    }

    if (dataTypes.includes('phone')) {
      const phoneCandidates = combinedText.match(/(?:\+?\d[\d\s().-]{6,}\d)/g) || [];
      const zhMobileCandidates =
        combinedText.match(/(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g) || [];

      phoneCandidates.forEach((phone) => {
        const normalizedPhone = normalizePhone(phone);
        if (normalizedPhone.length < 7 || normalizedPhone.length > 18) return;
        addResult(results, seen, {
          type: 'phone',
          value: normalizedPhone,
          source: finalUrl,
          confidence: 70,
        });
      });

      zhMobileCandidates.forEach((phone) =>
        addResult(results, seen, {
          type: 'phone',
          value: normalizePhone(phone),
          source: finalUrl,
          confidence: 88,
        }),
      );

      $('a[href^="tel:"]').each((_, elem) => {
        const href = ($(elem).attr('href') || '').trim();
        const phone = href.replace(/^tel:/i, '');
        addResult(results, seen, {
          type: 'phone',
          value: normalizePhone(phone),
          source: finalUrl,
          confidence: 99,
        });
      });
    }

    if (dataTypes.includes('links')) {
      const links = collectUrlCandidates($, combinedText, finalUrl);
      links.forEach((link) =>
        addResult(results, seen, {
          type: 'links',
          value: link,
          source: finalUrl,
          confidence: 100,
        }),
      );
    }

    if (dataTypes.includes('names')) {
      const nameCandidates = [
        title,
        ...$('h1,h2')
          .map((_, elem) => normalizeText($(elem).text()))
          .get(),
      ].filter(Boolean);

      nameCandidates.forEach((value) =>
        addResult(results, seen, {
          type: 'names',
          value,
          source: finalUrl,
          confidence: 60,
        }),
      );
    }

    if (dataTypes.includes('companies')) {
      const companyCandidates = [
        $('meta[property="og:site_name"]').attr('content') || '',
        $('meta[name="application-name"]').attr('content') || '',
      ]
        .map((value) => normalizeText(value))
        .filter(Boolean);

      if (companyCandidates.length === 0) {
        const copyright = $('footer')
          .text()
          .match(/©\s*(?:\d{4})?\s*([^,\n|]+)/);
        if (copyright?.[1]) {
          companyCandidates.push(normalizeText(copyright[1]));
        }
      }

      companyCandidates.forEach((value) =>
        addResult(results, seen, {
          type: 'companies',
          value,
          source: finalUrl,
          confidence: 75,
        }),
      );
    }

    if (dataTypes.includes('text')) {
      const textCandidates = textBlocks.length > 0 ? textBlocks : [combinedText];
      textCandidates.slice(0, 60).forEach((value) =>
        addResult(results, seen, {
          type: 'text',
          value,
          source: finalUrl,
          confidence: 80,
        }),
      );
    }

    const limitedResults = results.slice(0, MAX_RESULTS);

    if (requestUserId) {
      await grantReferralFirstUseReward({
        invitedUserId: requestUserId,
        toolId: "data-scraper",
      }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      count: limitedResults.length,
      data: limitedResults,
      warning,
    });
  } catch (error: any) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 },
    );
  }
}
