const wa = require("@open-wa/wa-automate");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  sessionId: "AMAZIO",
  multiDevice: true,
  authTimeout: 60,
  blockCrashLogs: true,
  disableSpins: true,
  headless: true,
  hostNotificationLang: "PT_BR",
  logConsole: false,
  popup: true,
  port: process.env.PORT || 5004,
  qrTimeout: 0,
};

// Bot responses and templates
const MESSAGES = {
  welcome: `👋 *Welcome to Amazio!*\n\nI'm your smart shopping assistant powered by AI. I analyze Amazon product reviews to help you make informed decisions.\n\n*Available Commands:*\n🔍 !analyze [productId] - Get detailed review analysis\n📊 !stats [productId] - View review statistics\n💡 !compare [productId1] [productId2] - Compare two products\n❓ !help - Show all commands\n\n_Developed by @boyepanthera & @smitha0928_`,

  analyzing:
    "🔍 *Analysis in Progress*\nPlease wait while I analyze the reviews for this product...\n\n_This usually takes about 30 seconds_",

  error: {
    general:
      "❌ Oops! Something went wrong. Please try again or contact support.",
    invalidProduct: "⚠️ Invalid product ID. Please check and try again.",
    noReviews:
      "📝 No reviews found for this product. It might be new or not available.",
    analysis:
      "⚠️ Unable to analyze reviews at the moment. Please try again later.",
  },

  help: {
    main: `*Amazio Commands Guide* 🤖\n\n*Basic Commands:*\n!analyze [productId] - Full review analysis\n!stats [productId] - Quick statistics\n!compare [productId1] [productId2] - Compare products\n!help [command] - Detailed help for a command\n\n*Examples:*\n!analyze B00ZV9PXP2\n!stats B00ZV9PXP2\n!compare B00ZV9PXP2 B00ZV9PXP3`,

    analyze:
      "*Analyze Command Help*\n\nUse !analyze [productId] to get:\n- Sentiment analysis\n- Review breakdown\n- Confidence score\n- Key insights\n- Recommendation\n\n*Example:* !analyze B00ZV9PXP2",

    stats:
      "*Stats Command Help*\n\nUse !stats [productId] to get:\n- Rating distribution\n- Review count\n- Quick summary\n\n*Example:* !stats B00ZV9PXP2",

    compare:
      "*Compare Command Help*\n\nUse !compare [productId1] [productId2] to:\n- Compare sentiments\n- View ratings side by side\n- Get recommendation\n\n*Example:* !compare B00ZV9PXP2 B00ZV9PXP3",
  },
};

// Analysis result loading with caching
const analysisCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

function loadProductAnalysis(productId) {
  try {
    // Check cache first
    if (analysisCache.has(productId)) {
      const cached = analysisCache.get(productId);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }

    const files = fs
      .readdirSync("bot_data")
      .filter((file) => file.startsWith(`analysis_${productId}_`))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const latestFile = path.join("bot_data", files[0]);
    const analysis = JSON.parse(fs.readFileSync(latestFile, "utf8"));

    // Cache the result
    analysisCache.set(productId, {
      timestamp: Date.now(),
      data: analysis,
    });

    return analysis;
  } catch (error) {
    console.error("Error loading analysis:", error);
    return null;
  }
}

async function analyzeProduct(productId) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python3", [
      "src/bot/analyze_product.py",
      productId,
    ]);
    let result = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(error || `Analysis failed with code ${code}`));
        return;
      }
      resolve(loadProductAnalysis(productId));
    });
  });
}

function formatAnalysisMessage(analysis) {
  const { summary } = analysis;
  const confidence = (summary.confidence_score * 100).toFixed(1);

  let sentiment_emoji = {
    positive: "✨",
    neutral: "😐",
    negative: "⚠️",
  }[summary.overall_sentiment];

  return (
    `*📊 Product Review Analysis*\n\n` +
    `${sentiment_emoji} *Overall Sentiment:* ${summary.overall_sentiment.toUpperCase()}\n` +
    `🎯 *Confidence:* ${confidence}%\n\n` +
    `*Review Distribution:*\n` +
    `📈 Positive: ${summary.review_counts.positive}\n` +
    `😐 Neutral: ${summary.review_counts.neutral}\n` +
    `📉 Negative: ${summary.review_counts.negative}\n\n` +
    `*Key Insights:*\n${formatKeyInsights(analysis)}\n\n` +
    `*Recommendation:*\n${summary.recommendation}\n\n` +
    `${generateBuyingAdvice(summary)}\n\n` +
    `_Analysis updated: ${new Date(analysis.timestamp).toLocaleString()}_`
  );
}

function formatKeyInsights(analysis) {
  // Extract and format key points from the analysis
  const insights = [];
  const { summary } = analysis;

  if (summary.confidence_score > 0.8) {
    insights.push("✓ High confidence in analysis");
  }

  const totalReviews = Object.values(summary.review_counts).reduce(
    (a, b) => a + b,
    0
  );
  const positiveRatio = summary.review_counts.positive / totalReviews;

  if (positiveRatio > 0.8) {
    insights.push("✓ Overwhelmingly positive reviews");
  } else if (positiveRatio < 0.3) {
    insights.push("⚠️ High number of negative reviews");
  }

  return insights.join("\n");
}

function generateBuyingAdvice(summary) {
  const confidenceHigh = summary.confidence_score > 0.8;
  const sentimentPositive = summary.overall_sentiment === "positive";

  if (confidenceHigh && sentimentPositive) {
    return "💡 *Pro Tip:* Strong buy recommendation based on review analysis!";
  } else if (sentimentPositive) {
    return "💡 *Pro Tip:* Generally positive reviews, but consider your specific needs.";
  } else if (summary.overall_sentiment === "neutral") {
    return "💡 *Pro Tip:* Mixed reviews - research specific features important to you.";
  } else {
    return "💡 *Pro Tip:* Consider alternative products based on review analysis.";
  }
}

async function handleMessage(message, client) {
  const { body, from } = message;
  console.log(`Message from ${from}: ${body}`);

  // Welcome message
  if (body.toLowerCase() === "hi" || body.toLowerCase() === "hello") {
    await client.sendText(from, MESSAGES.welcome);
    return;
  }

  // Help commands
  if (body.toLowerCase().startsWith("!help")) {
    const command = body.split(" ")[1];
    if (command && MESSAGES.help[command]) {
      await client.sendText(from, MESSAGES.help[command]);
    } else {
      await client.sendText(from, MESSAGES.help.main);
    }
    return;
  }

  // Product analysis
  if (body.toLowerCase().startsWith("!analyze")) {
    const productId = body.split(" ")[1];

    if (!productId) {
      await client.sendText(from, MESSAGES.error.invalidProduct);
      return;
    }

    await client.sendText(from, MESSAGES.analyzing);

    try {
      let analysis = await analyzeProduct(productId);

      if (!analysis) {
        await client.sendText(from, MESSAGES.error.noReviews);
        return;
      }

      await client.sendText(from, formatAnalysisMessage(analysis));
    } catch (error) {
      console.error("Analysis error:", error);
      await client.sendText(from, MESSAGES.error.analysis);
    }
    return;
  }

  // Stats command
  if (body.toLowerCase().startsWith("!stats")) {
    const productId = body.split(" ")[1];

    if (!productId) {
      await client.sendText(from, MESSAGES.error.invalidProduct);
      return;
    }

    try {
      let analysis = await analyzeProduct(productId);
      if (!analysis) {
        await client.sendText(from, MESSAGES.error.noReviews);
        return;
      }

      const stats =
        `*📊 Quick Stats*\n\n` +
        `Total Reviews: ${Object.values(analysis.summary.review_counts).reduce(
          (a, b) => a + b,
          0
        )}\n` +
        `Overall Sentiment: ${analysis.summary.overall_sentiment}\n` +
        `Confidence: ${(analysis.summary.confidence_score * 100).toFixed(1)}%`;

      await client.sendText(from, stats);
    } catch (error) {
      console.error("Stats error:", error);
      await client.sendText(from, MESSAGES.error.general);
    }
    return;
  }

  // Compare command
  if (body.toLowerCase().startsWith("!compare")) {
    const parts = body.split(" ");
    const productId1 = parts[1];
    const productId2 = parts[2];

    if (!productId1 || !productId2) {
      await client.sendText(
        from,
        "⚠️ Please provide two product IDs to compare."
      );
      return;
    }

    await client.sendText(from, "🔄 Comparing products...");

    try {
      const [analysis1, analysis2] = await Promise.all([
        analyzeProduct(productId1),
        analyzeProduct(productId2),
      ]);

      if (!analysis1 || !analysis2) {
        await client.sendText(from, MESSAGES.error.noReviews);
        return;
      }

      const comparison =
        `*📊 Product Comparison*\n\n` +
        `*Product 1:*\n` +
        `Sentiment: ${analysis1.summary.overall_sentiment}\n` +
        `Confidence: ${(analysis1.summary.confidence_score * 100).toFixed(
          1
        )}%\n\n` +
        `*Product 2:*\n` +
        `Sentiment: ${analysis2.summary.overall_sentiment}\n` +
        `Confidence: ${(analysis2.summary.confidence_score * 100).toFixed(
          1
        )}%\n\n` +
        `*Recommendation:*\n${compareProducts(analysis1, analysis2)}`;

      await client.sendText(from, comparison);
    } catch (error) {
      console.error("Comparison error:", error);
      await client.sendText(from, MESSAGES.error.general);
    }
  }
}

// Extract product ID from URL or text
function extractProductId(text) {
  // Match Amazon product ID patterns
  const urlPattern = /amazon\.com\/.*\/([A-Z0-9]{10})/i;
  const asinPattern = /[A-Z0-9]{10}/;

  // Check for URL first
  const urlMatch = text.match(urlPattern);
  if (urlMatch) return urlMatch[1];

  // Check for standalone ASIN
  const asinMatch = text.match(asinPattern);
  if (asinMatch) return asinMatch[0];

  return null;
}

function interpretUserMessage(text) {
  text = text.toLowerCase();

  // Check for product URLs or IDs
  const productId = extractProductId(text);
  if (productId) {
    return {
      command: "analyze",
      productId: productId,
    };
  }

  // Handle natural language queries
  if (
    text.includes("should i buy") ||
    text.includes("what do you think about")
  ) {
    return {
      command: "askForProduct",
      intent: "analysis",
    };
  }

  if (text.includes("compare") || text.includes("which is better")) {
    return {
      command: "askForComparison",
    };
  }

  return {
    command: "unknown",
  };
}

class ConversationState {
  constructor() {
    this.conversations = new Map();
  }

  get(userId) {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, {
        state: "idle",
        context: {},
      });
    }
    return this.conversations.get(userId);
  }

  update(userId, state, context = {}) {
    this.conversations.set(userId, { state, context });
  }
}

const conversationState = new ConversationState();

async function handleConversation(message, client) {
  const userId = message.from;
  const currentState = conversationState.get(userId);

  switch (currentState.state) {
    case "idle":
      const intent = interpretUserMessage(message.body);
      if (intent.command === "askForProduct") {
        await client.sendText(
          userId,
          "I can help you analyze that! Please share the Amazon product link or paste the product ID."
        );
        conversationState.update(userId, "awaitingProduct");
      }
      break;

    case "awaitingProduct":
      const productId = extractProductId(message.body);
      if (productId) {
        await analyzeProduct(productId, userId, client);
        conversationState.update(userId, "idle");
      } else {
        await client.sendText(
          userId,
          "I couldn't find a valid product ID. You can find it in the Amazon URL (it's 10 characters, like B00ZV9PXP2) or share the product link."
        );
      }
      break;
  }
}

const HELP_MESSAGES = {
  findProductId:
    `*How to Find a Product ID* 📝\n\n` +
    "1. Go to the Amazon product page\n" +
    "2. Look in the URL for a 10-character code (e.g., B00ZV9PXP2)\n" +
    "   OR\n" +
    "3. Simply share the product link with me\n\n" +
    "_Example: https://amazon.com/dp/B00ZV9PXP2_",

  examples:
    `*Example Commands* 💡\n\n` +
    "• What do you think about this product? (then share link)\n" +
    "• Should I buy this? (then share link)\n" +
    "• Compare these products (then share two links)\n" +
    "• Is this a good product? (then share link)",

  welcome:
    `👋 Hi! I'm Amazio, your shopping assistant.\n\n` +
    "I can help you make better shopping decisions by analyzing Amazon product reviews.\n\n" +
    "You can:\n" +
    "• Share a product link for analysis\n" +
    "• Ask me about a product\n" +
    "• Compare two products\n\n" +
    "Just tell me what you'd like to know!",
};

async function handleProductAnalysisError(error, userId, client) {
  if (error.code === "INVALID_PRODUCT_ID") {
    await client.sendText(
      userId,
      "I couldn't find that product. Here's how to find the correct product ID:"
    );
    await client.sendText(userId, HELP_MESSAGES.findProductId);
  } else if (error.code === "NO_REVIEWS") {
    await client.sendText(
      userId,
      "This product doesn't have enough reviews for analysis yet. Would you like to try another product?"
    );
  } else {
    await client.sendText(
      userId,
      "I ran into an issue analyzing this product. You can:\n" +
        "1. Try again\n" +
        "2. Try a different product\n" +
        "3. Share the product link instead of ID"
    );
  }
}

function compareProducts(analysis1, analysis2) {
  const score1 =
    analysis1.summary.confidence_score *
    (analysis1.summary.overall_sentiment === "positive"
      ? 1
      : analysis1.summary.overall_sentiment === "neutral"
      ? 0.5
      : 0);

  const score2 =
    analysis2.summary.confidence_score *
    (analysis2.summary.overall_sentiment === "positive"
      ? 1
      : analysis2.summary.overall_sentiment === "neutral"
      ? 0.5
      : 0);

  if (Math.abs(score1 - score2) < 0.1) {
    return "Both products have similar review profiles. Consider your specific needs and price points.";
  } else if (score1 > score2) {
    return "Product 1 has more favorable reviews and might be the better choice.";
  } else {
    return "Product 2 has more favorable reviews and might be the better choice.";
  }
}

function start(client) {
  client.onMessage(async (message) => {
    try {
      await handleMessage(message, client);
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  console.log("Amazio bot is ready! 🚀");
}

wa.create(CONFIG)
  .then((client) => start(client))
  .catch((error) => console.error("Failed to start bot:", error));
