# Import required libraries
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import pickle
import json
import os
from datetime import datetime
import logging
from sklearn.model_selection import GridSearchCV

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('model/training.log'),
        logging.StreamHandler()
    ]
)

class ReviewAnalyzer:
    def __init__(self, data_path='dataset/Datafiniti_Amazon_Consumer_Reviews_of_Amazon_Products.csv'):
        """Initialize the Review Analyzer with data path and create necessary directories"""
        self.data_path = data_path
        self.directories = ['model', 'model/validation', 'model/metadata', 'bot_data']
        self.create_directories()
        self.setup_nltk()
        
    def create_directories(self):
        """Create necessary directories for model artifacts"""
        for directory in self.directories:
            os.makedirs(directory, exist_ok=True)
            logging.info(f'Created directory: {directory}')

    def setup_nltk(self):
        """Download required NLTK data"""
        try:
            nltk.download('punkt')
            nltk.download('stopwords')
            self.stop_words = set(stopwords.words('english'))
            logging.info('NLTK setup completed successfully')
        except Exception as e:
            logging.error(f'Error setting up NLTK: {str(e)}')
            raise

    def load_and_prepare_data(self):
        """Load and prepare the dataset"""
        logging.info('Loading dataset...')
        try:
            self.df = pd.read_csv(self.data_path)
            logging.info(f'Dataset loaded with {len(self.df)} rows')
            
            # Create sentiment labels
            self.df['sentiment'] = self.df['reviews.rating'].apply(self.assign_sentiment)
            
            # Preprocess reviews
            self.df['processed_review'] = self.df['reviews.text'].apply(self.preprocess_text)
            
            logging.info('Data preparation completed successfully')
        except Exception as e:
            logging.error(f'Error in data preparation: {str(e)}')
            raise

    def assign_sentiment(self, rating):
        """Assign sentiment labels based on rating"""
        if rating >= 4:
            return 'positive'
        elif rating == 3:
            return 'neutral'
        else:
            return 'negative'

    def preprocess_text(self, text):
        """Preprocess text data"""
        try:
            # Convert to lowercase and string type
            text = str(text).lower()
            # Tokenize
            words = word_tokenize(text)
            # Remove stopwords and non-alphabetic words
            words = [word for word in words if word.isalpha() and word not in self.stop_words]
            return ' '.join(words)
        except Exception as e:
            logging.error(f'Error in text preprocessing: {str(e)}')
            return ""

    def train_model(self):
        """Train the sentiment analysis model"""
        logging.info('Starting model training...')
        try:
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                self.df['processed_review'], 
                self.df['sentiment'],
                test_size=0.2,
                random_state=42
            )

            # Create and fit vectorizer
            self.vectorizer = TfidfVectorizer(max_features=5000)
            X_train_vectorized = self.vectorizer.fit_transform(X_train)
            X_test_vectorized = self.vectorizer.transform(X_test)

            # Define hyperparameter grid for RandomForest
            param_grid = {
                'n_estimators': [100, 200],
                'max_depth': [10, 20, None],
                'min_samples_split': [2, 5],
                'min_samples_leaf': [1, 2]
            }

            # Initialize and train model with GridSearchCV
            self.model = GridSearchCV(
                RandomForestClassifier(random_state=42),
                param_grid,
                cv=5,
                n_jobs=-1,
                verbose=1
            )
            self.model.fit(X_train_vectorized, y_train)

            # Get best model
            best_model = self.model.best_estimator_

            # Calculate various metrics
            self.training_metrics = {
                'best_params': self.model.best_params_,
                'best_score': self.model.best_score_,
                'test_accuracy': best_model.score(X_test_vectorized, y_test),
                'cross_val_scores': cross_val_score(best_model, X_train_vectorized, y_train, cv=5).tolist(),
                'classification_report': classification_report(y_test, best_model.predict(X_test_vectorized), output_dict=True)
            }

            logging.info('Model training completed successfully')
            self.save_model_artifacts(X_train_vectorized)
            
        except Exception as e:
            logging.error(f'Error in model training: {str(e)}')
            raise

    def save_model_artifacts(self, X_train_vectorized):
        """Save model and related artifacts"""
        logging.info('Saving model artifacts...')
        try:
            # Save model
            with open('model/sentiment_model.pkl', 'wb') as f:
                pickle.dump(self.model.best_estimator_, f)

            # Save vectorizer
            with open('model/vectorizer.pkl', 'wb') as f:
                pickle.dump(self.vectorizer, f)

            # Save metadata
            metadata = {
                'training_date': datetime.now().isoformat(),
                'model_type': self.model.best_estimator_.__class__.__name__,
                'vectorizer_params': self.vectorizer.get_params(),
                'feature_count': len(self.vectorizer.get_feature_names_out()),
                'training_samples': X_train_vectorized.shape[0],
                'model_performance': self.training_metrics,
                'preprocessing_steps': [
                    'lowercase',
                    'tokenization',
                    'remove_stopwords',
                    'remove_non_alphabetic'
                ]
            }

            with open('model/metadata/model_info.json', 'w') as f:
                json.dump(metadata, f, indent=2)

            logging.info('Model artifacts saved successfully')
            
        except Exception as e:
            logging.error(f'Error saving model artifacts: {str(e)}')
            raise

    def validate_model(self):
        """Validate the saved model with test cases"""
        logging.info('Starting model validation...')
        try:
            # Load saved model components
            with open('model/sentiment_model.pkl', 'rb') as f:
                loaded_model = pickle.load(f)
            with open('model/vectorizer.pkl', 'rb') as f:
                loaded_vectorizer = pickle.load(f)

            # Test cases
            test_cases = [
                "This is the best product I've ever used! Absolutely fantastic quality.",
                "Complete waste of money. Poor quality and terrible customer service.",
                "It's okay, nothing special but gets the job done.",
                "Good product but a bit expensive for what you get.",
                "Not sure about this one, has some good points but also some issues.",
                "Arrived damaged and packaging was terrible.",
                "Perfect for my needs, exactly as described.",
                "Average performance, wouldn't buy again but not terrible."
            ]

            validation_results = []
            for test in test_cases:
                processed = self.preprocess_text(test)
                vectorized = loaded_vectorizer.transform([processed])
                prediction = loaded_model.predict(vectorized)[0]
                probability = np.max(loaded_model.predict_proba(vectorized)[0])
                
                result = {
                    'original_text': test,
                    'processed_text': processed,
                    'prediction': prediction,
                    'confidence': float(probability),
                    'vector_shape': vectorized.shape[1]
                }
                validation_results.append(result)

            # Save validation results
            with open('model/validation/validation_results.json', 'w') as f:
                json.dump({
                    'timestamp': datetime.now().isoformat(),
                    'test_cases': validation_results,
                    'summary': {
                        'total_cases': len(test_cases),
                        'high_confidence_predictions': sum(1 for r in validation_results if r['confidence'] > 0.8),
                        'average_confidence': np.mean([r['confidence'] for r in validation_results])
                    }
                }, f, indent=2)

            logging.info('Model validation completed successfully')
            
        except Exception as e:
            logging.error(f'Error in model validation: {str(e)}')
            raise

def main():
    """Main execution function"""
    try:
        # Initialize analyzer
        analyzer = ReviewAnalyzer()
        
        # Load and prepare data
        analyzer.load_and_prepare_data()
        
        # Train model
        analyzer.train_model()
        
        # Validate model
        analyzer.validate_model()
        
        logging.info('Review analyzer pipeline completed successfully')
        
    except Exception as e:
        logging.error(f'Pipeline failed: {str(e)}')
        raise

if __name__ == "__main__":
    main()