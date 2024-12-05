# Amazio - WhatsApp Amazon Review Analysis Bot 🤖

A sophisticated WhatsApp bot that helps users make informed purchase decisions by analyzing Amazon product reviews using sentiment analysis and machine learning.

## Features

- 📊 Analyze Amazon product reviews
- 🔄 Compare multiple products
- 💡 Get buying recommendations
- 🎯 View sentiment analysis with confidence scores
- 📈 See review distributions and key insights

## How to Use

1. **Start a Chat**

   - Send "Hi" or "Hello" to get started
   - The bot will introduce itself and show available commands

2. **Analyze a Product**

   - Share an Amazon product link
   - Example: `https://amazon.com/dp/B00ZV9PXP2`
   - The bot will analyze reviews and provide insights

3. **Compare Products**

   - Type "compare" or "which is better"
   - Share the first product link when prompted
   - Share the second product link when prompted
   - Get a detailed comparison

4. **Get Help**
   - Type "help" anytime to see available commands
   - Type "how" to learn how to share product links

## Setup

1. **Prerequisites**

```bash
# Node.js and Python required
node -v  # Should be v14+
python --version  # Should be 3.8+
```

2. **Installation**

```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Create required directories
mkdir -p model/metadata model/validation bot_data dataset
```

3. **Dataset Setup**

```bash
# Place the Amazon reviews dataset in dataset/ directory
dataset/Datafiniti_Amazon_Consumer_Reviews_of_Amazon_Products.csv
```

4. **Training and Validation**

```bash
# Train the model
npm run train:bot

# Validate the model
npm run validate:bot
```

5. **Run the Bot**

```bash
# Start the WhatsApp bot
npm run bot
```

## Commands

- `Hi/Hello` - Start conversation
- Share product link - Get review analysis
- `compare` - Compare two products
- `help` - Show available commands
- `how` - Learn how to share products

## Project Structure

```
AMAZIO/
├── src/
│   ├── bot/              # WhatsApp bot code
│   ├── training/         # Model training code
│   └── validation/       # Model validation
├── model/               # Trained model files
├── dataset/            # Amazon reviews dataset
└── bot_data/           # Analysis results
```

## Available Scripts

- `npm run bot` - Start the WhatsApp bot
- `npm run train:bot` - Train the sentiment analysis model
- `npm run validate:bot` - Validate the trained model

## Error Handling

- If a product isn't in our database, the bot will let you know
- If analysis fails, try sharing the product link again
- Use the help command if you're unsure about anything

## Technologies

- WhatsApp Integration: @open-wa/wa-automate
- Machine Learning: scikit-learn, NLTK
- Backend: Node.js, Python
- Data Processing: pandas, numpy

## Contributors

- Olanrewaju A. Olaboye ([@boyepanthera](https://github.com/boyepanthera))
- Smitha Raghavendra ([@smitha0928](https://github.com/smitha0928))

## License

ISC License

---

Made with ❤️ by the Amazio Team
