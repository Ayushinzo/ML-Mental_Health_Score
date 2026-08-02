import joblib
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import os
from pydantic import BaseModel, ValidationError
import pandas as pd

class MentalHealthInput(BaseModel):
    academicLevel: str
    activity: int | float
    age: int | float
    country: str
    gender: str
    platform: str
    purpose: str
    sleep: int | float
    stress: str
    study: int | float
    usage: int | float
    unlocks: int | float

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/predict": {"origins": os.getenv('FRONTEND_URL')}
})

# Load the trained model
model = joblib.load('mental_health_model.pkl')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get JSON from request
        json_data = request.get_json()

        if json_data is None:
            return jsonify({"error": "Invalid JSON"}), 400

        # Validate using Pydantic
        data = MentalHealthInput(**json_data)

        # Convert to DataFrame
        input_df = pd.DataFrame([{
            "Study_Hours": data.study,
            "Age": data.age,
            "Avg_Daily_Usage_Hours": data.usage,
            "Physical_Activity_Hours": data.activity,
            "Sleep_Hours_Per_Night": data.sleep,
            "Daily_Unlocks": data.unlocks,
            "Stress_Level": data.stress,
            "Gender": data.gender,
            "Country": data.country,
            "Academic_Level": data.academicLevel,
            "Most_Used_Platform": data.platform,
            "Purpose_Of_Use": data.purpose,
        }])

        # Make prediction
        prediction = model.predict(input_df)[0]

        return jsonify({
            "score": float(prediction)  # Ensure the prediction is JSON serializable
        })
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
        }), 400

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )