const axios = require("axios");
const { DEFAULT_FEEDS } = require("./feedList");
const { ScholarshipCandidateRepository } = require("../../repositories/ScholarshipCandidateRepository");

const repo = new ScholarshipCandidateRepository();

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function readTag(xmlChunk, tagName) {
  const match = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i").exec(xmlChunk || "");
  return normalize(match?.[1] || "");
}

function parseRssItems(xml) {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return items
    .map((itemXml) => {
      const title = readTag(itemXml, "title");
      const link = readTag(itemXml, "link") || normalize(/<link[^>]*href="([^"]+)"/i.exec(itemXml || "")?.[1] || "");
      const publishedAt = readTag(itemXml, "pubDate") || readTag(itemXml, "published") || readTag(itemXml, "updated");
      return { title, link, publishedAt };
    })
    .filter((item) => item.link);
}

function toIsoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function collectRssSignals(feeds = DEFAULT_FEEDS) {
  const summary = { feeds: feeds.length, collected: 0, failedFeeds: 0 };
  for (const feed of feeds) {
    try {
      const { data } = await axios.get(feed.url, {
        timeout: 15000,
        responseType: "text",
        headers: { "User-Agent": "ScholarshipCandidateBot/1.0" },
      });
      const items = parseRssItems(String(data || ""));
      for (const item of items) {
        const inserted = await repo.saveRawRssItem({
          feedName: feed.name,
          itemTitle: item.title,
          itemUrl: item.link,
          publishedAt: toIsoDate(item.publishedAt),
        });
        if (inserted) summary.collected += 1;
      }
    } catch (err) {
      summary.failedFeeds += 1;
      // eslint-disable-next-line no-console
      console.error(`RSS collection failed for ${feed.url}:`, err.message || err);
    }
  }
  return summary;
}

module.exports = { collectRssSignals };

