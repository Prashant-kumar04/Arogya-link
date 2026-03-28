import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

FEATURE_ORDER = [
    "Age", "Sex", "Cholesterol", "Heart Rate", "Diabetes", "Smoking",
    "Obesity", "Alcohol Consumption", "Exercise Hours Per Week",
    "Previous Heart Problems", "Medication Use", "Stress Level",
    "Sedentary Hours Per Day", "BMI", "Triglycerides",
    "Physical Activity Days Per Week", "Sleep Hours Per Day",
    "Systolic", "Diastolic", "Diet_Average", "Diet_Healthy", "Diet_Unhealthy"
]

def generate_mock_data(size=1000):
    np.random.seed(42)
    data = {}
    for feature in FEATURE_ORDER:
        if feature in ["Sex", "Diabetes", "Smoking", "Obesity", "Alcohol Consumption", 
                      "Previous Heart Problems", "Medication Use", "Diet_Average", 
                      "Diet_Healthy", "Diet_Unhealthy"]:
            data[feature] = np.random.randint(0, 2, size)
        elif feature == "Age":
            data[feature] = np.random.randint(18, 90, size)
        elif feature == "Cholesterol":
            data[feature] = np.random.randint(120, 400, size)
        elif feature == "Systolic":
            data[feature] = np.random.randint(90, 180, size)
        elif feature == "Diastolic":
            data[feature] = np.random.randint(60, 110, size)
        elif feature == "BMI":
            data[feature] = np.random.uniform(18, 40, size)
        else:
            data[feature] = np.random.uniform(0, 10, size)
    
    # Target: Simple weighted logic to create a "risk" label
    df = pd.DataFrame(data)
    score = (df['Age'] / 90) * 0.2 + (df['Systolic'] / 180) * 0.3 + (df['Smoking']) * 0.2
    df['Target'] = (score > 0.5).astype(int)
    return df

def train_and_save():
    print("Generating mock health data for training...")
    df = generate_mock_data(2000)
    X = df[FEATURE_ORDER]
    y = df['Target']
    
    print("Training heart attack risk model (RandomForest)...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    output_path = "arogya_link_ensemble_model2.pkl"
    print(f"Saving model to {output_path}...")
    joblib.dump(model, output_path)
    print("AI Model effectively restored! ✅")

if __name__ == "__main__":
    train_and_save()
