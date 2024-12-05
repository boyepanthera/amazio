const wa = require("@open-wa/wa-automate");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Analysis result loading with caching
const analysisCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Import all the configurations and messages
const { CONFIG, MESSAGES, HELP_MESSAGES, GREETINGS } = require("./config");

// Conversation state management
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

// Product ID utilities
class ProductHelper {
  static extractProductId(text) {
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

  static interpretUserMessage(text) {
    text = text.toLowerCase();

    // Check for product URLs or IDs
    const productId = this.extractProductId(text);
    if (productId) {
      return {
        command: "analyze",
        productId: productId,
      };
    }

    // Handle natural language queries
    if (
      text.includes("should i buy") ||
      text.includes("what do you think about") ||
      text.includes("is this good")
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

    if (text.includes("help") || text.includes("how")) {
      return {
        command: "help",
      };
    }

    return {
      command: "unknown",
    };
  }
}

// Analysis handling
class ProductAnalyzer {
  static async analyzeProduct(productId) {
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
        resolve(this.loadProductAnalysis(productId));
      });
    });
  }

  static loadProductAnalysis(productId) {
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
  static formatAnalysisMessage(analysis) {
    const { summary, product_info } = analysis;
    const confidence = (summary.confidence_score * 100).toFixed(1);

    let sentiment_emoji = {
      positive: "✨",
      neutral: "😐",
      negative: "⚠️",
    }[summary.overall_sentiment];

    return (
      `*📊 Analysis for ${product_info.name}*\n` +
      `${product_info.url}\n\n` +
      `${sentiment_emoji} *Overall Sentiment:* ${summary.overall_sentiment.toUpperCase()}\n` +
      `🎯 *Confidence:* ${confidence}%\n\n` +
      `*Review Distribution:*\n` +
      `📈 Positive: ${summary.review_counts.positive}\n` +
      `😐 Neutral: ${summary.review_counts.neutral}\n` +
      `📉 Negative: ${summary.review_counts.negative}\n\n` +
      `*Key Insights:*\n${ProductAnalyzer.formatKeyInsights(analysis)}\n\n` +
      `*Recommendation:*\n${summary.recommendation}\n\n` +
      `${ProductAnalyzer.generateBuyingAdvice(summary)}\n\n` +
      `_Analysis updated: ${new Date(analysis.timestamp).toLocaleString()}_`
    );
  }

  static generateBuyingAdvice(summary) {
    const confidenceHigh = summary.confidence_score > 0.8;
    const sentimentPositive = summary.overall_sentiment === "positive";

    if (confidenceHigh && sentimentPositive) {
      return "💡 *Pro Tip:* Strong buy recommendation! Reviews show consistent satisfaction.";
    } else if (sentimentPositive) {
      return "💡 *Pro Tip:* Generally positive reviews, but do check if it meets your specific needs.";
    } else if (summary.overall_sentiment === "neutral") {
      return "💡 *Pro Tip:* Mixed reviews - look into specific features that matter to you most.";
    } else {
      return "💡 *Pro Tip:* Consider exploring alternatives based on review analysis.";
    }
  }

  static formatKeyInsights(analysis) {
    const insights = [];
    const { summary } = analysis;

    if (summary.confidence_score > 0.8) {
      insights.push("✓ High confidence in analysis");
    }

    const totalReviews = Object.values(summary.review_counts).reduce(
      (a, b) => a + b,
      0
    );
    insights.push(`✓ Analysis based on ${totalReviews} reviews`);

    const positiveRatio = summary.review_counts.positive / totalReviews;

    if (positiveRatio > 0.8) {
      insights.push("✓ Overwhelmingly positive feedback");
    } else if (positiveRatio < 0.3) {
      insights.push("⚠️ Significant number of negative reviews");
    }

    if (summary.review_counts.neutral > totalReviews * 0.3) {
      insights.push("ℹ️ Many reviewers have mixed feelings");
    }

    return insights.join("\n");
  }
}

// Main message handler
class MessageHandler {
  constructor() {
    this.conversationState = new ConversationState();
  }

  async handleMessage(message, client) {
    const userId = message.from;
    const currentState = this.conversationState.get(userId);
    const userInput = message.body;

    try {
      // Always log incoming messages
      console.log(`Message from ${userId}: ${userInput}`);

      // Handle based on current conversation state
      switch (currentState.state) {
        case "idle":
          await this.handleIdleState(userInput, userId, client);
          break;

        case "awaitingProduct":
          await this.handleAwaitingProduct(userInput, userId, client);
          break;

        case "awaitingComparisonFirst": // Added this case
          await this.handleAwaitingComparison(userInput, userId, client);
          break;

        case "awaitingComparisonSecond":
          await this.handleAwaitingComparison(userInput, userId, client);
          break;

        default:
          await this.handleUnknownState(userId, client);
      }
    } catch (error) {
      console.error("Error handling message:", error);
      await client.sendText(userId, MESSAGES.error.general);
    }
  }

  async handleIdleState(userInput, userId, client) {
    const intent = ProductHelper.interpretUserMessage(userInput);

    switch (intent.command) {
      case "analyze":
        await this.handleProductAnalysis(intent.productId, userId, client);
        break;

      case "askForProduct":
        await client.sendText(userId, MESSAGES.askForProduct);
        this.conversationState.update(userId, "awaitingProduct");
        break;

      case "askForComparison":
        await client.sendText(userId, MESSAGES.askForFirstProduct);
        this.conversationState.update(userId, "awaitingComparisonFirst");
        break;

      case "help":
        await client.sendText(userId, HELP_MESSAGES.welcome);
        await client.sendText(userId, HELP_MESSAGES.findProductId);
        break;

      default:
        if (GREETINGS.includes(userInput.toLowerCase())) {
          await client.sendText(userId, MESSAGES.welcome);
        } else {
          await client.sendText(userId, MESSAGES.unknown);
        }
    }
  }

  async handleAwaitingProduct(userInput, userId, client) {
    const productId = ProductHelper.extractProductId(userInput);
    if (productId) {
      await this.handleProductAnalysis(productId, userId, client);
      this.conversationState.update(userId, "idle");
    } else {
      await client.sendText(userId, HELP_MESSAGES.findProductId);
    }
  }

  async handleProductAnalysis(productId, userId, client) {
    await client.sendText(userId, MESSAGES.analyzing);

    try {
      const analysis = await ProductAnalyzer.analyzeProduct(productId);

      // Handle the no product case
      if (analysis === "NO_PRODUCT_IN_DATASET") {
        await client.sendText(
          userId,
          "❌ Sorry, I don't have any review data for this product in my database yet.\n\n" +
            "This could be because:\n" +
            "• It's a new product\n" +
            "• The product isn't in my current dataset\n" +
            "• The product ID might be incorrect\n\n" +
            "Please try another product or check the product ID."
        );
        return;
      }

      if (!analysis) {
        await client.sendText(userId, MESSAGES.error.noReviews);
        return;
      }

      await client.sendText(
        userId,
        ProductAnalyzer.formatAnalysisMessage(analysis)
      );
    } catch (error) {
      console.error("Analysis error:", error);
      await client.sendText(userId, MESSAGES.error.analysis);
    }
  }

  // Add these methods to the MessageHandler class

  async handleUnknownState(userId, client) {
    // Reset state and inform user
    this.conversationState.update(userId, "idle");
    await client.sendText(
      userId,
      "I lost track of our conversation. Let's start over!\n\n" +
        MESSAGES.welcome
    );
  }

  async handleAwaitingComparison(userInput, userId, client) {
    const productId = ProductHelper.extractProductId(userInput);
    if (!productId) {
      await client.sendText(userId, HELP_MESSAGES.findProductId);
      return;
    }

    const currentState = this.conversationState.get(userId);
    console.log("Comparison state context:", currentState.context); // Debug log

    if (currentState.state === "awaitingComparisonFirst") {
      // Store first product and ask for second
      this.conversationState.update(userId, "awaitingComparisonSecond", {
        firstProduct: productId,
      });
      await client.sendText(userId, MESSAGES.askForSecondProduct);
    } else if (currentState.state === "awaitingComparisonSecond") {
      // We have both products, do comparison
      await this.handleProductComparison(
        currentState.context.firstProduct,
        productId,
        userId,
        client
      );
      this.conversationState.update(userId, "idle");
    }
  }

  async handleProductComparison(productId1, productId2, userId, client) {
    await client.sendText(userId, MESSAGES.analyzing);

    try {
      // Get analysis for both products
      const [analysis1, analysis2] = await Promise.all([
        ProductAnalyzer.analyzeProduct(productId1),
        ProductAnalyzer.analyzeProduct(productId2),
      ]);

      // Check if either analysis failed
      if (!analysis1 || !analysis2) {
        await client.sendText(
          userId,
          "❌ Sorry, I couldn't analyze one or both products. " +
            "Please make sure both products are in my database."
        );
        return;
      }

      // Format comparison message
      const comparisonMessage = this.formatComparisonMessage(
        analysis1,
        analysis2
      );
      await client.sendText(userId, comparisonMessage);
    } catch (error) {
      console.error("Comparison error:", error);
      await client.sendText(userId, MESSAGES.error.comparison);
    }
  }

  formatComparisonMessage(analysis1, analysis2) {
    const product1 = analysis1.product_info;
    const product2 = analysis2.product_info;

    return (
      `*📊 Product Comparison*\n\n` +
      `*1️⃣ ${product1.name}*\n` +
      `Sentiment: ${analysis1.summary.overall_sentiment.toUpperCase()}\n` +
      `Confidence: ${(analysis1.summary.confidence_score * 100).toFixed(
        1
      )}%\n` +
      `Reviews: ${Object.values(analysis1.summary.review_counts).reduce(
        (a, b) => a + b,
        0
      )}\n\n` +
      `*2️⃣ ${product2.name}*\n` +
      `Sentiment: ${analysis2.summary.overall_sentiment.toUpperCase()}\n` +
      `Confidence: ${(analysis2.summary.confidence_score * 100).toFixed(
        1
      )}%\n` +
      `Reviews: ${Object.values(analysis2.summary.review_counts).reduce(
        (a, b) => a + b,
        0
      )}\n\n` +
      `*Recommendation:*\n${this.generateComparisonRecommendation(
        analysis1,
        analysis2
      )}`
    );
  }

  generateComparisonRecommendation(analysis1, analysis2) {
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
      return "📊 Both products have similar review profiles. Consider your specific needs and budget.";
    } else if (score1 > score2) {
      return `💡 ${analysis1.product_info.name} appears to have more favorable reviews.`;
    } else {
      return `💡 ${analysis2.product_info.name} appears to have more favorable reviews.`;
    }
  }
}

// Bot initialization
function start(client) {
  const messageHandler = new MessageHandler();

  client.onMessage(async (message) => {
    try {
      await messageHandler.handleMessage(message, client);
    } catch (error) {
      console.error("Error in message handling:", error);
    }
  });

  console.log("Amazio bot is ready! 🚀");
}

// Create and initialize the bot
wa.create(CONFIG)
  .then((client) => start(client))
  .catch((error) => console.error("Failed to start bot:", error));
