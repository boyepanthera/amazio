import json
import pickle
import logging
from datetime import datetime
import sys
import os
import pandas as pd
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
import nltk

# Ensure NLTK resources are available
nltk.download('punkt')
nltk.download('stopwords')

class ProductAnalyzer:
    def __init__(self, model_dir='model/', dataset_path='dataset/Datafiniti_Amazon_Consumer_Reviews_of_Amazon_Products.csv'):
        """Initialize the analyzer with model directory and dataset path"""
        self.model_dir = model_dir
        self.dataset_path = dataset_path
        self.setup_logging()
        self.load_model_components()
        self.load_product_database()

    def setup_logging(self):
        """Set up logging configuration"""
        os.makedirs('bot_data', exist_ok=True)
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('bot_data/analyzer.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def load_model_components(self):
        """Load the trained model and vectorizer"""
        try:
            with open(f'{self.model_dir}sentiment_model.pkl', 'rb') as f:
                self.model = pickle.load(f)
            with open(f'{self.model_dir}vectorizer.pkl', 'rb') as f:
                self.vectorizer = pickle.load(f)
            with open(f'{self.model_dir}metadata/model_info.json', 'r') as f:
                self.model_info = json.load(f)
            self.logger.info('Model components loaded successfully')
        except Exception as e:
            self.logger.error(f'Error loading model components: {str(e)}')
            raise

    def load_product_database(self):
        """Load product names and reviews from the dataset"""
        try:
            self.logger.info('Loading product database...')
            df = pd.read_csv(self.dataset_path)
            
            # Log initial dataset size
            self.logger.info(f'Initial dataset size: {len(df)} rows')

            # Create a mapping of ASIN to product details
            self.product_database = {}
            
            # Process each row instead of grouping
            for _, row in df.iterrows():
                try:
                    # Handle multiple ASINs in one field
                    asins = str(row['asins'])
                    # Split ASINs if there are multiple and clean them
                    product_ids = [asin.strip() for asin in asins.split(',') if asin.strip()]
                    
                    for product_id in product_ids:
                        if pd.notna(product_id):
                            self.product_database[product_id] = {
                                'name': row['name'],
                                'brand': row.get('brand', 'Unknown Brand'),
                                'category': row.get('primaryCategories', 'General')
                            }
                except Exception as e:
                    self.logger.error(f'Error processing row: {str(e)}')
                    continue
            
            self.logger.info(f'Successfully loaded {len(self.product_database)} products from database')
            
            # Store the DataFrame for review lookups
            self.reviews_df = df
            
            # Log some sample ASINs for verification
            sample_asins = list(self.product_database.keys())[:5]
            self.logger.info(f'Sample ASINs in database: {sample_asins}')
            
        except Exception as e:
            self.logger.error(f'Error loading product database: {str(e)}')
            self.product_database = {}
            self.reviews_df = pd.DataFrame()


    def get_product_reviews(self, product_id):
        """Get reviews for a specific product"""
        if self.reviews_df.empty:
            self.logger.warning('No reviews database available')
            return []
            
        try:
            # Log the search attempt
            self.logger.info(f'Searching for reviews of product: {product_id}')
            
            # Handle potential string formatting issues
            clean_product_id = str(product_id).strip()
            
            # Try different matching strategies
            reviews = []
            
            # First try exact match
            exact_matches = self.reviews_df[
                self.reviews_df['asins'].str.contains(f"^{clean_product_id}$|^{clean_product_id},|,{clean_product_id},|,{clean_product_id}$", 
                na=False, 
                regex=True)
            ]
            
            if not exact_matches.empty:
                reviews = exact_matches['reviews.text'].tolist()
                self.logger.info(f'Found {len(reviews)} reviews with exact match')
                
                # Log a sample review for verification
                if reviews:
                    self.logger.info(f'Sample review: {reviews[0][:100]}...')
            
            if not reviews:
                # Try partial match as fallback
                partial_matches = self.reviews_df[
                    self.reviews_df['asins'].str.contains(clean_product_id, na=False, regex=False)
                ]
                
                if not partial_matches.empty:
                    reviews = partial_matches['reviews.text'].tolist()
                    self.logger.info(f'Found {len(reviews)} reviews with partial match')
            
            if not reviews:
                # Log the surrounding context for debugging
                self.logger.warning(f'No reviews found for product {product_id}')
                sample_asins = self.reviews_df['asins'].head().tolist()
                self.logger.info(f'Sample ASINs in dataset: {sample_asins}')
                return []
                
            return reviews
            
        except Exception as e:
            self.logger.error(f'Error getting reviews for product {product_id}: {str(e)}')
            return []

    def get_product_info(self, product_id):
        """Get product information with fallback"""
        default_info = {
            'name': f'Amazon Product ({product_id})',
            'brand': 'Unknown Brand',
            'category': 'General'
        }
        
        try:
            return self.product_database.get(str(product_id), default_info)
        except Exception as e:
            self.logger.error(f'Error getting product info: {str(e)}')
            return default_info

    def preprocess_text(self, text):
        """Preprocess review text"""
        try:
            text = str(text).lower()
            words = word_tokenize(text)
            stop_words = set(stopwords.words('english'))
            words = [word for word in words if word.isalpha() and word not in stop_words]
            return ' '.join(words)
        except Exception as e:
            self.logger.error(f'Error in text preprocessing: {str(e)}')
            return text

    def analyze_reviews(self, reviews):
        """Analyze a list of reviews"""
        results = []
        sentiment_counts = {
            'positive': 0,
            'neutral': 0,
            'negative': 0
        }
        
        for review in reviews:
            try:
                processed_review = self.preprocess_text(review)
                vectorized = self.vectorizer.transform([processed_review])
                
                prediction = self.model.predict(vectorized)[0]
                probabilities = self.model.predict_proba(vectorized)[0]
                confidence = float(max(probabilities))
                
                sentiment_counts[prediction] += 1
                
                results.append({
                    'review': review,
                    'processed': processed_review,
                    'sentiment': prediction,
                    'confidence': confidence
                })
                
            except Exception as e:
                self.logger.error(f'Error analyzing review: {str(e)}')
                continue
        
        return results, sentiment_counts

    def generate_recommendation(self, sentiment_counts, confidence):
        """Generate a recommendation based on analysis"""
        total = sum(sentiment_counts.values())
        if total == 0:
            return "Not enough reviews to make a recommendation."
            
        positive_ratio = sentiment_counts['positive'] / total
        
        if positive_ratio >= 0.8 and confidence >= 0.8:
            return "Highly recommended based on consistently positive reviews."
        elif positive_ratio >= 0.6:
            return "Generally recommended with some minor concerns noted."
        elif positive_ratio >= 0.4:
            return "Mixed reviews - carefully consider your specific needs."
        else:
            return "Exercise caution - significant number of negative reviews."

    def save_results(self, product_id, analysis_results, sentiment_counts):
        """Save analysis results"""
        try:
            if not analysis_results:
                raise ValueError("NO_REVIEWS_FOUND")

            total_reviews = len(analysis_results)
            avg_confidence = sum(r['confidence'] for r in analysis_results) / total_reviews if total_reviews > 0 else 0
            
            summary = {
                'overall_sentiment': max(sentiment_counts.items(), key=lambda x: x[1])[0] if any(sentiment_counts.values()) else "neutral",
                'confidence_score': avg_confidence,
                'review_counts': sentiment_counts,
                'recommendation': self.generate_recommendation(sentiment_counts, avg_confidence)
            }

            product_info = self.get_product_info(product_id)
            product_info['id'] = product_id
            product_info['url'] = f'https://www.amazon.com/dp/{product_id}'

            output = {
                'product_id': product_id,
                'product_info': product_info,
                'timestamp': datetime.now().isoformat(),
                'summary': summary,
                'detailed_analysis': analysis_results
            }

            os.makedirs('bot_data', exist_ok=True)
            filename = f'bot_data/analysis_{product_id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
            with open(filename, 'w') as f:
                json.dump(output, f, indent=2)

            return filename

        except Exception as e:
            self.logger.error(f'Error saving results: {str(e)}')
            raise

def main(product_id):
    try:
        analyzer = ProductAnalyzer()
        
        # Get reviews for the product
        reviews = analyzer.get_product_reviews(product_id)
        
        # Log more details about the search
        analyzer.logger.info(f'Product ID: {product_id}')
        analyzer.logger.info(f'Found {len(reviews)} reviews')
        
        if not reviews:
            print("NO_PRODUCT_IN_DATASET")
            analyzer.logger.warning(f'No reviews found in dataset for product {product_id}')
            sys.exit(1)
        
        # Analyze reviews
        analysis_results, sentiment_counts = analyzer.analyze_reviews(reviews)
        
        if not analysis_results:
            print("NO_REVIEWS_FOUND")
            analyzer.logger.warning('Analysis produced no results')
            sys.exit(1)
        
        # Save and return results
        results_file = analyzer.save_results(product_id, analysis_results, sentiment_counts)
        print(results_file)
        
    except Exception as e:
        logging.error(f"Error in main execution: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python analyze_product.py <product_id>", file=sys.stderr)
        sys.exit(1)
    
    main(sys.argv[1])