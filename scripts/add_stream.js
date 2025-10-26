#!/usr/bin/env node
// add_stream.js
// Usage: node scripts/add_stream.js <youtube_url> [--end "YYYY-MM-DDTHH:MM:SS"]
// If --end is omitted, uses current local time as the end time.

const fs = require('fs');
const path = require('path');

// Load environment variables from .env if present
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed — it's optional. If you want .env support, install dotenv.
}

async function fetchText(url) {
  // Use the jina.ai text proxy which is tolerant to YouTube pages in CI
  const proxy = `https://r.jina.ai/http://www.youtube.com/watch?v=${getVideoId(url)}`;
  const res = await fetch(proxy);
  if (!res.ok) throw new Error(`Failed to fetch video page: ${res.status}`);
  return await res.text();
}

function getVideoId(url) {
  const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) return short[1];
  throw new Error('Could not parse video id from url');
}

function parseDurationIso(iso) {
  // ISO 8601 duration like PT1H2M3S
  const re = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const m = iso.match(re);
  if (!m) return 0;
  const h = parseInt(m[1] || '0', 10);
  const mm = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  return h * 3600 + mm * 60 + s;
}

function formatDate(dt) {
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatTime(dt) {
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  const ss = String(dt.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function roundHours(seconds) {
  return Math.round((seconds / 3600) * 100) / 100;
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/add_stream.js <youtube_url> [--end "YYYY-MM-DDTHH:MM:SS"]');
    process.exit(1);
  }
  const url = args[0];
  let end = null;
  const endIndex = args.indexOf('--end');
  if (endIndex !== -1 && args[endIndex + 1]) {
    end = new Date(args[endIndex + 1]);
    if (isNaN(end)) {
      console.error('Invalid --end datetime. Use ISO format: YYYY-MM-DDTHH:MM:SS');
      process.exit(1);
    }
  }
  return { url, end };
}

async function main() {
  const { url, end } = parseArgs();
  const csvPath = path.join(process.cwd(), 'public', 'streaming_sessions.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at', csvPath);
    process.exit(1);
  }

  console.log('Fetching video metadata...');

  // Try YouTube Data API first if API key is provided in env YT_API_KEY or YOUTUBE_API_KEY
  let uploadDate = null;
  let durationIso = null;
  const apiKey = process.env.YT_API_KEY || process.env.YOUTUBE_API_KEY;
  
  if (apiKey) {
    try {
      const vid = getVideoId(url);
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${vid}&key=${apiKey}`;
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const apiJson = await apiRes.json();
        if (apiJson.items && apiJson.items.length > 0) {
          const item = apiJson.items[0];
          if (item.snippet && item.snippet.publishedAt) {
            // publishedAt is like 2025-10-23T02:00:54Z — keep date portion
            uploadDate = item.snippet.publishedAt.split('T')[0];
          }
          if (item.contentDetails && item.contentDetails.duration) {
            durationIso = item.contentDetails.duration;
          }
        }
      } else {
        console.warn('YouTube Data API responded with', apiRes.status);
      }
    } catch (err) {
      console.warn('YouTube Data API fetch failed:', err.message || err);
    }
  }

  // If API didn't yield results, fall back to scraping the page via text proxy
  let text = null;
  if (!uploadDate || !durationIso) {
    text = await fetchText(url);
  }

  // Try to find JSON-LD block in the page if needed

  if (text) {
    const jsonldRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    let m;
    while ((m = jsonldRe.exec(text)) !== null) {
    try {
      const j = JSON.parse(m[1]);
      if (j && j['@type'] === 'VideoObject') {
        uploadDate = j.uploadDate || uploadDate;
        durationIso = j.duration || durationIso;
        break;
      }
      // sometimes it's an array
      if (Array.isArray(j)) {
        for (const item of j) {
          if (item['@type'] === 'VideoObject') {
            uploadDate = item.uploadDate || uploadDate;
            durationIso = item.duration || durationIso;
            break;
          }
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }
  }

  // Fallback: look for duration pattern like "duration":"PT45M6S"
  if (!durationIso && text) {
    const durMatch = text.match(/"duration"\s*:\s*"(PT[^"]+)"/);
    if (durMatch) durationIso = durMatch[1];
  }

  if (!uploadDate) {
    // Try to find "Streamed" textual hint with relative time - not reliable
    // Fallback to today's date
    uploadDate = formatDate(new Date());
    console.warn('uploadDate not found in page — using today:', uploadDate);
  }

  if (!durationIso) {
    console.warn('duration not found — assuming 1 hour');
    durationIso = 'PT1H';
  }

  const durationSeconds = parseDurationIso(durationIso);
  const hours = roundHours(durationSeconds);

  // Determine end datetime
  const now = end ? new Date(end) : new Date();
  const endDate = new Date(now);

  // started datetime = end - duration
  const startedDateObj = new Date(endDate.getTime() - durationSeconds * 1000);

  // Read CSV and get last line
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  const header = lines[0];
  const dataLines = lines.slice(1);
  let lastLine = dataLines.length > 0 ? dataLines[dataLines.length - 1] : null;

  let lastAfter = 0;
  let lastStreamNumber = 0;
  if (lastLine) {
    const cols = lastLine.split(',');
    lastAfter = parseFloat(cols[3]) || 0;
    lastStreamNumber = parseInt(cols[8], 10) || 0;
  }

  const before = Math.round((lastAfter + Number.EPSILON) * 100) / 100;
  const after = Math.round((before + hours + Number.EPSILON) * 100) / 100;
  const dateStr = formatDate(endDate);
  const timeStr = formatTime(endDate);
  const startedDateStr = formatDate(startedDateObj);
  const startedTimeStr = formatTime(startedDateObj);
  const streamNumber = lastStreamNumber + 1;

  const newLine = [
    dateStr,
    timeStr,
    before.toString(),
    after.toString(),
    hours.toString(),
    startedDateStr,
    startedTimeStr,
    url,
    streamNumber.toString()
  ].join(',') + '\n';

  fs.appendFileSync(csvPath, newLine, 'utf8');
  console.log('Appended new row:');
  console.log(newLine);
}

// Polyfill fetch for older Node versions
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
