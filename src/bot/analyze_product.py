import sys
import os
import json
import pickle
import logging
from datetime import datetime

class ProductAnalyzer:
    def __init__(self, model_dir='model/'):
        self.model_dir = model_dir
        self.setup_logging()
        self.load_model_components()

    def setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('bot_data/analyzer.log'),
                logging.StreamHandler()
            ]
        )

    def load_model_components(self):
        """Load the trained model and its components"""
        try:
            with open(f'{self.model_dir}sentiment_model.pkl', 'rb') as f:
                self.model = pickle.load(f)
            with open(f'{self.model_dir}vectorizer.pkl', 'rb') as f:
                self.vectorizer = pickle.load(f)
            with open(f'{self.model_dir}metadata/model_info.json', 'r') as f:
                self.model_info = json.load(f)
            logging.info('Model components loaded successfully')
        except Exception as e:
            logging.error(f'Error loading model components: {str(e)}')
            raise

    def analyze_reviews(self, reviews):
        """Analyze a list of reviews"""
        results = []
        for review in reviews:
            try:
                # Vectorize the review
                vectorized = self.vectorizer.transform([review])
                
                # Get prediction and confidence
                prediction = self.model.predict(vectorized)[0]
                probabilities = self.model.predict_proba(vectorized)[0]
                confidence = float(max(probabilities))
                
                results.append({
                    'review': review,
                    'sentiment': prediction,
                    'confidence': confidence,
                    'analysis_timestamp': datetime.now().isoformat()
                })
            except Exception as e:
                logging.error(f'Error analyzing review: {str(e)}')
                continue
                
        return results

    def generate_summary(self, results):
        """Generate a summary of the analysis results"""
        try:
            total_reviews = len(results)
            sentiment_counts = {
                'positive': sum(1 for r in results if r['sentiment'] == 'positive'),
                'neutral': sum(1 for r in results if r['sentiment'] == 'neutral'),
                'negative': sum(1 for r in results if r['sentiment'] == 'negative')
            }
            
            avg_confidence = sum(r['confidence'] for r in results) / total_reviews
            
            return {
                'overall_sentiment': max(sentiment_counts, key=sentiment_counts.get),
                'confidence_score': avg_confidence,
                'review_counts': sentiment_counts,
                'recommendation': self.generate_recommendation(sentiment_counts, avg_confidence)
            }
        except Exception as e:
            logging.error(f'Error generating summary: {str(e)}')
            raise

    def generate_recommendation(self, sentiment_counts, confidence):
        """Generate a recommendation based on the analysis"""
        total = sum(sentiment_counts.values())
        positive_ratio = sentiment_counts['positive'] / total
        
        if positive_ratio >= 0.8 and confidence >= 0.8:
            return "Highly Recommended - Strong positive sentiment with high confidence"
        elif positive_ratio >= 0.6:
            return "Recommended - Generally positive reviews"
        elif positive_ratio >= 0.4:
            return "Mixed Reviews - Consider carefully based on your needs"
        else:
            return "Not Recommended - Predominantly negative reviews"

    def save_results(self, product_id, analysis_results, summary):
        """Save the analysis results"""
        output = {
            'product_id': product_id,
            'timestamp': datetime.now().isoformat(),
            'summary': summary,
            'detailed_analysis': analysis_results,
            'model_info': {
                'model_type': self.model_info['model_type'],
                'training_date': self.model_info['training_date']
            }
        }
        
        filename = f'bot_data/analysis_{product_id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(filename, 'w') as f:
            json.dump(output, f, indent=2)
            
        return filename

def main(product_id):
    try:
        analyzer = ProductAnalyzer()
        
        # In a real implementation, you would fetch reviews for the product_id
        # For demonstration, using sample reviews
        sample_reviews = [
            "This product is amazing! Exactly what I needed.",
            "Good quality but a bit expensive",
            "Not what I expected, had to return it",
            "Perfect for my needs, highly recommend",
            "Average product, nothing special"
        ]
        
        # Analyze reviews
        analysis_results = analyzer.analyze_reviews(sample_reviews)
        
        # Generate summary
        summary = analyzer.generate_summary(analysis_results)
        
        # Save results
        results_file = analyzer.save_results(product_id, analysis_results, summary)
        
        # Print the filename for the Node.js process
        print(results_file)
        
    except Exception as e:
        logging.error(f"Error in main execution: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python analyze_product.py <product_id>", file=sys.stderr)
        sys.exit(1)
    
    main(sys.argv[1])