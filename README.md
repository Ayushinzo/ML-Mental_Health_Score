# Mental Health Score Predictor

A lightweight mental health score prediction project built with a Flask backend and a modern web interface. Users answer questions about their habits, social media usage, stress, sleep, and activity. The backend returns a wellbeing score on a 0–10 scale.

## Project Structure

- `backend/`
  - `main.py` - Flask server exposing `/predict` and rendering a backend template.
  - `mental_health_model.pkl` - trained machine learning model used for predictions.
  - `requirments.txt` - Python package dependencies.
  - `Student Social Media And Mental Health Impact.csv` - source dataset for model development.
  - `mental_health_score.ipynb` - Jupyter notebook for research, exploration, or model training.
  - `.env` - environment configuration used for CORS.
  - `templates/index.html` - Flask template used by backend root route.

- `frontend/`
  - `templates/index.html` - front-end UI shell and form.
  - `scripts/script.js` - JavaScript logic for input binding, form submission, scoring, and gauge animation.
  - `scripts/style.css` - responsive styling, theme switcher, and layout.

## Features

- Responsive form for demographic, social media, sleep, study, and activity inputs.
- Material Web components for polished controls.
- Sliding wheels for continuous inputs like usage, study, activity, and sleep.
- Backend validation with Pydantic.
- Prediction endpoint returning a score from the trained model.
- Theme toggle for light / dark display.

## Prerequisites

- Python 3.10+ (recommended)
- `pip`
- A browser to open the frontend

## Backend Setup

1. Open a terminal in the `backend/` folder.
2. Create and activate a Python virtual environment (optional but recommended):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Install dependencies:

```powershell
pip install -r requirments.txt
```

4. Ensure `.env` is present and contains the expected frontend origin:

```text
FRONTEND_URL=http://127.0.0.1:5500
```

5. Run the backend server:

```powershell
python main.py
```

The backend will start on `http://127.0.0.1:5000` and expose the prediction endpoint at `/predict`.

## Frontend Setup

The frontend is a static web interface that sends prediction requests to the backend.

### Option 1: Use VS Code Live Server or another local static server

- Open `frontend/templates/index.html` in a static server.
- Confirm the frontend is served from `http://127.0.0.1:5500` or update `FRONTEND_URL` in `backend/.env`.

### Option 2: Open directly in browser

- Open `frontend/templates/index.html` from the filesystem.
- If the browser blocks local `fetch()` due to cross-origin restrictions, use a static server.

## How to Use

1. Open the frontend page in a browser.
2. Complete all required fields:
   - Age, gender, country, academic level
   - Most used platform, purpose of use, daily unlocks
   - Average daily usage, study hours, activity hours, sleep hours
   - Stress level
3. Submit the form.
4. The frontend sends a POST request to `http://127.0.0.1:5000/predict`.
5. The backend validates input and returns a JSON object like:

```json
{
  "score": 7.42
}
```

6. The frontend updates the gauge and score display.

## API Endpoint

### `POST /predict`

Request JSON payload:

```json
{
  "academicLevel": "Undergraduate",
  "activity": 2.5,
  "age": 21,
  "country": "India",
  "gender": "Male",
  "platform": "Instagram",
  "purpose": "Entertainment",
  "sleep": 7,
  "stress": "medium",
  "study": 3,
  "usage": 4,
  "unlocks": 120
}
```

Response:

```json
{
  "score": 6.7
}
```

Errors return HTTP `400` with an error payload.

## Notes

- The backend loads `mental_health_model.pkl` at startup. Keep the file in the `backend/` folder.
- The frontend currently points to `http://127.0.0.1:5000/predict`. Change this URL in `frontend/scripts/script.js` if the backend is hosted elsewhere.
- The `.env` file configures allowed CORS origins for the `/predict` endpoint.

## Troubleshooting

- If the frontend fails to connect, verify the backend is running at `http://127.0.0.1:5000`.
- If `joblib` or `Flask` is missing, reinstall dependencies with `pip install -r requirments.txt`.
- If the API returns `Invalid JSON`, make sure the frontend is sending a proper JSON body and `Content-Type: application/json`.
- If you need to change the frontend origin, update `FRONTEND_URL` in `backend/.env` and restart the server.

## Optional Improvements

- Add model retraining logic in `mental_health_score.ipynb` and export a fresh `.pkl` file.
- Add proper form error messages and server-side feedback.
- Add support for more countries, platforms, and stress levels.
- Add Docker support for easier deployment.

## License

This repository does not include a license file. Add one if you plan to publish or share the code publicly.
