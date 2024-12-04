# Amazio - WhatsApp Amazon Review Analysis Bot

A sophisticated WhatsApp bot that helps users make informed purchase decisions by analyzing Amazon product reviews using sentiment analysis and machine learning.

## Project Overview

Amazio uses:

- Machine learning for sentiment analysis (Random Forest Classifier)
- Amazon product review dataset for training
- WhatsApp as an interface (@open-wa/wa-automate)
- Python for ML processing
- Node.js for bot functionality

## Directory Structure

```
your-project/
├── dataset/
│   └── Datafiniti_Amazon_Consumer_Reviews_of_Amazon_Products.csv
│
├── model/                    # Created automatically by scripts
│   ├── metadata/            # Model information and parameters
│   ├── validation/          # Validation results
│   ├── sentiment_model.pkl  # Saved trained model
│   └── vectorizer.pkl       # Saved TF-IDF vectorizer
│
├── bot_data/                # Analysis results for WhatsApp bot
│   └── analyzer.log         # Bot analysis logs
│
├── src/
│   ├── training/
│   │   └── review_analyzer.py        # Training pipeline
│   │
│   ├── validation/
│   │   └── model_validator.py        # Validation suite
│   │
│   └── bot/
│       ├── analyze_product.py        # Python analysis bridge
│       └── index.js                  # WhatsApp bot main file
│
├── requirements.txt         # Python dependencies
└── package.json            # Node.js dependencies
```

## Prerequisites

### Python Requirements

- Python 3.8 or higher
- pip package manager

### Node.js Requirements

- Node.js 14 or higher
- npm package manager

### Dataset

- Download the Datafiniti Amazon Consumer Reviews dataset
- Place it in the `dataset/` directory

## Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd your-project
```

2. **Create virtual environment (recommended)**

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install Python dependencies**

```bash
pip install -r requirements.txt
```

4. **Install Node.js dependencies**

```bash
npm install
```

5. **Create required directories**

```bash
mkdir -p dataset model/metadata model/validation bot_data
```

## Setup Steps

1. **Prepare Dataset**

   - Place the Amazon reviews dataset in the `dataset/` directory
   - Ensure it's named correctly: `Datafiniti_Amazon_Consumer_Reviews_of_Amazon_Products.csv`

2. **Train the Model**

```bash
python src/training/review_analyzer.py
```

This will:

- Process the review dataset
- Train the sentiment analysis model
- Save the model and vectorizer
- Create metadata files

3. **Run Model Validation**

```bash
python src/validation/model_validator.py
```

This validates:

- Model performance
- Preprocessing consistency
- Edge case handling
- Prediction confidence

4. **Start the WhatsApp Bot**

```bash
node src/bot/index.js
```

## WhatsApp Bot Commands

- `!analyze [productId]` - Analyze reviews for a specific Amazon product
- `!help` - Display help message and available commands

Example:

```
!analyze B00ZV9PXP2
```

## Component Details

### Review Analyzer (`review_analyzer.py`)

- Handles data preprocessing
- Implements model training
- Includes feature engineering
- Saves trained model artifacts

### Model Validator (`model_validator.py`)

- Comprehensive validation suite
- Tests edge cases
- Validates preprocessing
- Generates performance metrics

### Product Analyzer (`analyze_product.py`)

- Bridge between Python ML and Node.js
- Real-time review analysis
- Sentiment prediction
- Confidence scoring

### WhatsApp Bot (`index.js`)

- User interface via WhatsApp
- Command handling
- Response formatting
- Error handling

## Logs and Monitoring

- Training logs: `model/training.log`
- Analysis logs: `bot_data/analyzer.log`
- Validation results: `model/validation/`
- Model metadata: `model/metadata/`

## Error Handling

The system includes comprehensive error handling:

- Dataset validation
- Model training monitoring
- Analysis result verification
- Bot command validation

## Performance Metrics

Access model performance metrics in:

- `model/metadata/model_info.json`
- `model/validation/validation_results_[timestamp].json`

## Troubleshooting

1. **Model Training Issues**

   - Check dataset format
   - Verify memory requirements
   - Review training logs

2. **WhatsApp Bot Connection**

   - Ensure proper authentication
   - Check network connectivity
   - Verify QR code scan

3. **Analysis Errors**
   - Check model files exist
   - Verify file permissions
   - Review analyzer logs

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Contributors

- Olanrewaju Olaboye ([@boyepanthera](https://github.com/boyepanthera))
- Smitha Raghavendra ([@smitha0928](https://github.com/smitha0928))

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Datafiniti for the Amazon reviews dataset
- @open-wa/wa-automate for WhatsApp integration
- scikit-learn for ML capabilities
