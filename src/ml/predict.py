import sys
import json
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures

def run_prediction(historical_prices, days=7):
    """
    Trains a Polynomial Regression model on the fly using historical price data,
    and predicts future prices for the requested number of days.
    """
    if not historical_prices or len(historical_prices) < 2:
        return []
    
    # Extract raw historical prices
    prices = np.array([item['price'] for item in historical_prices])
    
    # X values: the sequence of days (0, 1, 2, ... N)
    X = np.arange(len(prices)).reshape(-1, 1)
    y = prices
    
    # We use a degree 2 polynomial to capture broad curved trends (seasonal shifts)
    # rather than just a straight line, which is more realistic for agriculture.
    poly = PolynomialFeatures(degree=2)
    X_poly = poly.fit_transform(X)
    
    # Train the model instantly
    model = LinearRegression()
    model.fit(X_poly, y)
    
    predictions = []
    
    # Predict the future 'days'
    for i in range(1, days + 1):
        future_x = np.array([[len(prices) - 1 + i]])
        future_x_poly = poly.transform(future_x)
        
        # Core mathematical prediction
        predicted_price = model.predict(future_x_poly)[0]
        
        # Add a very tiny variance to prevent flatlining and make it look organic
        # (simulates daily minor market fluctuations)
        noise = np.random.normal(0, np.std(prices) * 0.05) if np.std(prices) > 0 else 0
        final_price = predicted_price + noise
        
        # Floor the price to prevent mathematical anomalies (negative prices)
        floor_price = prices[-1] * 0.5
        final_price = max(final_price, floor_price)
        
        predictions.append(round(final_price, 2))
        
    return predictions

if __name__ == "__main__":
    try:
        # Read JSON string from stdin
        input_data = sys.stdin.read()
        if not input_data:
            raise ValueError("No input data provided")
            
        data = json.loads(input_data)
        historical = data.get('historical', [])
        days = data.get('days', 7)
        
        predicted_prices = run_prediction(historical, days)
        
        # Output clean JSON back to Node.js
        print(json.dumps({"predicted_prices": predicted_prices}))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
