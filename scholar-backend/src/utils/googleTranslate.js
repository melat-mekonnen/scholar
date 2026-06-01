const https = require("https");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitText(text, maxLen = 4500) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxLen) return [trimmed];

  const parts = [];
  let rest = trimmed;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf("\n\n", maxLen);
    if (cut < maxLen * 0.5) cut = rest.lastIndexOf(". ", maxLen);
    if (cut < maxLen * 0.5) cut = rest.lastIndexOf(" ", maxLen);
    if (cut < 1) cut = maxLen;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

function translateChunk(text, { from = "en", to = "am" } = {}) {
  return new Promise((resolve, reject) => {
    const q = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${q}`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            const translated = (parsed[0] || []).map((part) => part[0]).join("");
            resolve(translated || text);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

async function googleTranslateText(text, options = {}) {
  const chunks = splitText(text);
  if (!chunks.length) return "";

  const out = [];
  for (const chunk of chunks) {
    // eslint-disable-next-line no-await-in-loop
    out.push(await translateChunk(chunk, options));
    // eslint-disable-next-line no-await-in-loop
    await sleep(120);
  }
  return out.join("\n\n");
}

module.exports = {
  googleTranslateText,
  splitText,
};
