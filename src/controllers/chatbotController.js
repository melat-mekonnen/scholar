const { queryChatbot } = require("../usecases/chatbot/queryChatbot");
const { getAiChatQuota } = require("../usecases/subscription/getAiChatQuota");

async function quota(req, res, next) {
  try {
    const userId = req.user?.id;
    const data = await getAiChatQuota(userId);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function query(req, res, next) {
  try {
    const userId = req.user?.id;
    const message = req.body?.message;
    const topK = req.body?.topK;
    const data = await queryChatbot({ userId, message, topK });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { query, quota };

