// config.js
// const CONFIG = {
//   sessionId: "AMAZIO",
//   multiDevice: true,
//   authTimeout: 120,
//   blockCrashLogs: true,
//   disableSpins: true,
//   headless: true,
//   hostNotificationLang: "PT_BR",
//   logConsole: false,
//   popup: true,
//   port: 5004,
//   qrTimeout: 0,
// };

const CONFIG = {
  sessionId: "AMAZIO",
  multiDevice: true,
  authTimeout: 120, // Increased timeout to 120 seconds
  blockCrashLogs: true,
  disableSpins: true,
  headless: true, // Changed to false to see the QR code more easily
  hostNotificationLang: "EN", // Changed to English
  logConsole: true, // Enable logging for debugging
  popup: true,
  qrTimeout: 0, // Wait indefinitely for QR scan
  useChrome: true,
  killProcessOnBrowserClose: true,
  port: 5004,
  throwErrorOnTosBlock: false,
  //   chromiumArgs: [
  //     "--no-sandbox",
  //     "--disable-setuid-sandbox",
  //     "--disable-dev-shm-usage",
  //     "--disable-accelerated-2d-canvas",
  //     "--disable-gpu",
  //     "--window-size=1920x1080",
  //   ],
  //   executablePath: process.env.GOOGLE_CHROME_BIN || undefined, // For both local and deployment
};

const GREETINGS = ["hi", "hey", "hello", "xup"];

const MESSAGES = {
  askForSecondProduct:
    "Great! Now share the second product you'd like to compare.",

  welcome: `👋 Hi! I'm Amazio, your shopping assistant.\n\nI can help you make better shopping decisions by analyzing Amazon product reviews. Just:\n\n• Share a product link\n• Ask me about a product\n• Compare products\n\nWhat would you like to know?`,

  analyzing:
    "🔍 Analyzing product reviews... This usually takes about 30 seconds.",

  askForProduct:
    "Sure! Please share the Amazon product link or product ID, and I'll analyze it for you.",

  askForFirstProduct:
    "I'll help you compare products! Please share the first product link or ID.",

  unknown:
    "I'm not sure what you mean. You can:\n• Share a product link\n• Ask 'Should I buy this?'\n• Say 'Compare products'\n• Type 'help' for more information",

  error: {
    comparison:
      "❌ Sorry, I couldn't complete the comparison. Please try again.",
    general:
      "❌ Oops! Something went wrong. Please try again or type 'help' for guidance.",
    invalidProduct:
      "⚠️ I couldn't find that product. Try sharing the Amazon product link instead.",
    noReviews: "📝 This product doesn't have enough reviews for analysis yet.",
    analysis: "⚠️ I had trouble analyzing this product. Please try again.",
  },
};

const HELP_MESSAGES = {
  findProductId:
    `*How to Find a Product ID* 📝\n\n` +
    "1. Go to the Amazon product page\n" +
    "2. Look in the URL for a 10-character code (e.g., B00ZV9PXP2)\n" +
    "   OR\n" +
    "3. Simply share the product link with me\n\n" +
    "_Example: https://amazon.com/dp/B00ZV9PXP2_",

  welcome:
    `*Amazio Help Guide* 🤖\n\n` +
    "I can help you:\n" +
    "• Analyze product reviews\n" +
    "• Compare products\n" +
    "• Make shopping decisions\n\n" +
    "Just share a product link or ask me:\n" +
    "• 'Should I buy this?'\n" +
    "• 'What do you think about this product?'\n" +
    "• 'Compare these products'\n\n" +
    "Need help finding a product ID? Type 'how to find ID'",
};

module.exports = {
  CONFIG,
  MESSAGES,
  HELP_MESSAGES,
  GREETINGS,
};
