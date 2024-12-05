# Import required libraries
import numpy as np
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import pickle
import json
from datetime import datetime
 
class ModelValidator:
    """Enhanced validation suite for the sentiment analysis model"""
    
    def __init__(self, model_path='model/'):
        self.model_path = model_path
        self.load_components()
        self.setup_validation_cases()
        
    def load_components(self):
        """Load all model components for validation"""
        with open(f'{self.model_path}sentiment_model.pkl', 'rb') as f:
            self.model = pickle.load(f)
        with open(f'{self.model_path}vectorizer.pkl', 'rb') as f:
            self.vectorizer = pickle.load(f)
        with open(f'{self.model_path}metadata/model_info.json', 'r') as f:
            self.model_info = json.load(f)
            
    def setup_validation_cases(self):
        """Define comprehensive test cases"""
        self.test_cases = {
            'positive': [
                "This is an absolutely amazing product! Best purchase ever.",
                "High quality, great value, fast shipping. Couldn't be happier.",
                "Exceeded all my expectations, worth every penny.",
                "Perfect for what I needed, highly recommend to others."
            ],
            'negative': [
                "Terrible quality, broke after first use. Avoid!",
                "Complete waste of money, very disappointing.",
                "Poor customer service and product didn't work.",
                "Wouldn't recommend to anyone, save your money."
            ],
            'neutral': [
                "It's okay, nothing special but gets the job done.",
                "Average product, has pros and cons.",
                "Decent for the price, but could be better.",
                "Not sure about this one, mixed feelings."
            ],
            'edge_cases': [
                "",  # Empty review
                "!@#$%",  # Special characters
                "5 stars",  # Numeric with text
                "a" * 1000,  # Very long review
                "短评",  # Non-English text
                "ALL CAPS REVIEW!!!",  # All caps with punctuation
            ]
        }
        
    def validate_preprocessing(self, text):
        """Validate preprocessing consistency"""
        processed = self.preprocess_text(text)
        vectorized = self.vectorizer.transform([processed])
        
        return {
            'original': text,
            'processed': processed,
            'vector_shape': vectorized.shape,
            'feature_count': vectorized.shape[1],
            'expected_features': len(self.vectorizer.get_feature_names_out()),
            'is_valid': vectorized.shape[1] == len(self.vectorizer.get_feature_names_out())
        }
        
    def validate_predictions(self, category):
        """Validate predictions for a category of test cases"""
        results = []
        for test in self.test_cases[category]:
            try:
                processed = self.preprocess_text(test)
                vectorized = self.vectorizer.transform([processed])
                prediction = self.model.predict(vectorized)[0]
                confidence = np.max(self.model.predict_proba(vectorized)[0])
                
                results.append({
                    'test_case': test,
                    'processed': processed,
                    'prediction': prediction,
                    'confidence': float(confidence),
                    'category': category,
                    'success': True
                })
            except Exception as e:
                results.append({
                    'test_case': test,
                    'error': str(e),
                    'category': category,
                    'success': False
                })
        return results
    
    def run_comprehensive_validation(self):
        """Run all validation tests"""
        validation_results = {
            'timestamp': datetime.now().isoformat(),
            'model_info': self.model_info,
            'preprocessing_validation': {},
            'prediction_validation': {},
            'edge_case_handling': {},
            'performance_metrics': {}
        }
        
        # Test preprocessing
        for category, cases in self.test_cases.items():
            validation_results['preprocessing_validation'][category] = [
                self.validate_preprocessing(test) for test in cases
            ]
        
        # Test predictions
        for category in self.test_cases.keys():
            validation_results['prediction_validation'][category] = self.validate_predictions(category)
        
        # Calculate validation metrics
        validation_results['performance_metrics'] = self.calculate_validation_metrics(validation_results)
        
        # Save validation results
        self.save_validation_results(validation_results)
        
        return validation_results
    
    def calculate_validation_metrics(self, results):
        """Calculate comprehensive validation metrics"""
        metrics = {
            'preprocessing': {
                'total_cases': 0,
                'successful_preprocessing': 0,
                'feature_dimension_matches': 0
            },
            'predictions': {
                'total_predictions': 0,
                'successful_predictions': 0,
                'high_confidence_predictions': 0,
                'average_confidence': 0.0
            },
            'edge_cases': {
                'total_handled': 0,
                'successfully_handled': 0
            }
        }
        
        # Calculate metrics from results
        for category in results['preprocessing_validation']:
            for test in results['preprocessing_validation'][category]:
                metrics['preprocessing']['total_cases'] += 1
                if test['is_valid']:
                    metrics['preprocessing']['successful_preprocessing'] += 1
                    
        for category in results['prediction_validation']:
            predictions = results['prediction_validation'][category]
            metrics['predictions']['total_predictions'] += len(predictions)
            metrics['predictions']['successful_predictions'] += sum(1 for p in predictions if p['success'])
            metrics['predictions']['high_confidence_predictions'] += sum(1 for p in predictions 
                                                                      if p['success'] and p['confidence'] > 0.8)
            
            confidences = [p['confidence'] for p in predictions if p['success']]
            if confidences:
                metrics['predictions']['average_confidence'] = float(np.mean(confidences))
        
        return metrics
    
    def save_validation_results(self, results):
        """Save validation results to file"""
        filename = f'{self.model_path}validation/validation_results_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
            
    def preprocess_text(self, text):
        """Preprocess text using saved parameters"""
        text = str(text).lower()
        words = word_tokenize(text)
        stop_words = set(stopwords.words('english'))
        words = [word for word in words if word.isalpha() and word not in stop_words]
        return ' '.join(words)

def run_validation():
    """Run the complete validation suite"""
    validator = ModelValidator()
    results = validator.run_comprehensive_validation()
    
    print("\nValidation Summary:")
    print("-" * 50)
    
    metrics = results['performance_metrics']
    print(f"Preprocessing Success Rate: {metrics['preprocessing']['successful_preprocessing'] / metrics['preprocessing']['total_cases']:.2%}")
    print(f"Prediction Success Rate: {metrics['predictions']['successful_predictions'] / metrics['predictions']['total_predictions']:.2%}")
    print(f"High Confidence Predictions: {metrics['predictions']['high_confidence_predictions'] / metrics['predictions']['total_predictions']:.2%}")
    print(f"Average Prediction Confidence: {metrics['predictions']['average_confidence']:.2%}")

if __name__ == "__main__":
    run_validation()