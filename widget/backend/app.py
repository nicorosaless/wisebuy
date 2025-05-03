import os
import time
import requests
import openai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import jwt

# Cargar variables de entorno desde un archivo .env
load_dotenv()

# Configurar la clave de API para la API de OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("La variable de entorno OPENAI_API_KEY no está configurada.")
openai.api_key = OPENAI_API_KEY

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HTMLBody(BaseModel):
    body: str

class URLData(BaseModel):
    url: str

# Configuración de la API de VirusTotal
VIRUSTOTAL_API_KEY = "ea25dac6c303cbd4c86a268761e45e11e016508c9426e46985bccdfd3c651d9b"
HEADERS = {
    "x-apikey": VIRUSTOTAL_API_KEY,
    "accept": "application/json",
    "Content-Type": "application/x-www-form-urlencoded"
}

def scan_and_get_report(url: str) -> dict:
    """
    Escanea una URL usando la API de VirusTotal y devuelve el informe de análisis.
    """
    try:
        print(f"Scanning URL: {url}")  # Log para verificar la URL
        data = f"url={url}"
        resp = requests.post("https://www.virustotal.com/api/v3/urls", headers=HEADERS, data=data)
        print(f"VirusTotal response status: {resp.status_code}")  # Log para verificar el estado de la respuesta
        resp.raise_for_status()
        analysis_id = resp.json()["data"]["id"]

        time.sleep(15)

        analysis = requests.get(f"https://www.virustotal.com/api/v3/analyses/{analysis_id}", headers=HEADERS)
        print(f"Analysis response status: {analysis.status_code}")  # Log para verificar el estado del análisis
        analysis.raise_for_status()
        return analysis.json()
    except Exception as e:
        print(f"Error al analizar la URL: {e}")
        return {"error": str(e)}

@app.post("/check-fraud")
async def check_fraud(data: URLData):
    url = data.url
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    report = scan_and_get_report(url)

    if "data" in report and "attributes" in report["data"] and "stats" in report["data"]["attributes"]:
        stats = report["data"]["attributes"]["stats"]
        is_fraudulent = stats.get("malicious", 0) > 0
        return {"isFraudulent": is_fraudulent, "stats": stats}
    else:
        raise HTTPException(status_code=500, detail="Unable to analyze the URL")

barato = "gpt-3.5-turbo"
demosigma = "gpt-4-turbo"

@app.post("/generate-description")
async def generate_description(data: HTMLBody):
    try:
        body = data.body
        if not body:
            raise HTTPException(status_code=400, detail="El body es requerido")

        response = openai.ChatCompletion.create(
            model=barato,
            messages=[
                {"role": "system", "content": "You are an AI assistant specialized in analyzing e-commerce transactions. Based on the HTML content of a payment gateway page, your goal is to determine exactly what is being purchased. Provide a concise and well-structured description of the purchase, including product names, quantities, and any other relevant details."},
                {"role": "user", "content": f"HTML Content: {body}\n\nPlease provide a concise and well-structured description of the purchase being made."}
            ],
            temperature=0.2,
            max_tokens=2000,
        )

        description = response["choices"][0]["message"]["content"]
        print("Generated Description:", description)
        return {"description": description}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ocurrió un error: {str(e)}")

# Configuración de MongoDB
MONGO_URI = "mongodb+srv://admin:admin123!123!@cluster0.sr16lln.mongodb.net/"
DB_NAME = "widget"
mongo_client = MongoClient(MONGO_URI)
db = mongo_client[DB_NAME]
users_collection = db["users"]

SECRET_KEY = "your_jwt_secret_key"
ALGORITHM = "HS256"

class UserLogin(BaseModel):
    email: str
    password: str

@app.post("/login")
async def login(user: UserLogin):
    user_data = users_collection.find_one({"email": user.email})
    if not user_data or user.password != user_data["password"]:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = jwt.encode({"email": user.email}, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token}

@app.post("/logout")
async def logout():
    return {"message": "Logout successful"}
