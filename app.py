from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)
CORS(app)  # Enables CORS for all routes

# Configure Gemini API key (replace with your actual key)
genai.configure(api_key="AIzaSyBnH0YnlQ9f_l8IC1YOX0NNf7ndirqfmZ8")

# Initialize Firebase Admin SDK for Firestore
cred = credentials.Certificate(
    r"C:\wamp64\www\secrets\testbase-ca192-firebase-adminsdk-fbsvc-70b69341fd.json"
)
firebase_admin.initialize_app(cred)
db = firestore.client()

@app.route("/generate", methods=["POST"])
def generate():
    data = request.json
    prompt = data.get("prompt", "")
    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = model.generate_content(prompt)
        mcq_text = response.text
        return jsonify({"result": mcq_text})
    except Exception as e:
        return jsonify({"error": str(e)})

def parse_mcq_text(mcq_text):
 # Split by double newlines (each question block)
    blocks = re.split(r'\n\s*\n', mcq_text.strip())
    result = []
    for block in blocks:
        # Extract question
        q_match = re.search(r'\*\*\d+\.\s*Question:\*\*\s*(.+)', block)
        if not q_match:
            continue
        question = q_match.group(1).strip()

        # Extract options
        options = []
        for opt_match in re.finditer(r'\*\s+([A-D])\)\s+(.+)', block):
            options.append(opt_match.group(2).strip())

        # Extract correct answer
        correct_match = re.search(r'\*\*Correct Answer:\s*([A-D])\)\s+(.+)\*\*', block)
        if correct_match:
            correct = correct_match.group(2).strip()
        else:
            correct = ""

        result.append({
            "Question": question,
            "Options": options,
            "Correct": correct
        })
    return result

@app.route("/upload_mcqs", methods=["POST"])
def upload_mcqs():
    data = request.json
    quiz_title = data.get("quizTitle", "[Quiz] Week One")
    # Accept either raw AI MCQ text or already parsed list of question dicts
    if "mcq_text" in data:
        mcqs = parse_mcq_text(data["mcq_text"])
    else:
        mcqs = data.get("questions", [])
    # Note: Each MCQ is stored as a separate document in the 'is216' collection
    for idx, mcq in enumerate(mcqs, start=1):
        doc_id = f"{quiz_title} Q{idx}"  # e.g., "[Quiz] Week One Q1", "[Quiz] Week One Q2", ...
        db.collection('is216').document(doc_id).set(mcq)
    response = {"status": "success", "count": len(mcqs)}
    print(response)  # This will show in your Flask terminal/console
    return jsonify(response)

if __name__ == "__main__":
    app.run(debug=True)
