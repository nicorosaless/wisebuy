from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import requests
import time

# Cargar variables de entorno desde un archivo .env
load_dotenv()

# Configurar la clave de API para el cliente de OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("La variable de entorno OPENAI_API_KEY no está configurada. Por favor, configúrala en un archivo .env o en el entorno del sistema.")

client = OpenAI(api_key=OPENAI_API_KEY)

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
VIRUSTOTAL_API_KEY = "ea25dac6c303cbd4c86a268761e45e11e016508c9426e46985bccdfd3c651d9b"  # Sustituye por tu clave
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
        # 1) Enviar la URL para escaneo
        data = f"url={url}"
        resp = requests.post("https://www.virustotal.com/api/v3/urls", headers=HEADERS, data=data)
        resp.raise_for_status()
        analysis_id = resp.json()["data"]["id"]

        # 2) Esperar a que VT complete el análisis
        time.sleep(15)  # Ajustable según tu cuota y tiempo de análisis

        # 3) Recuperar el informe de análisis
        analysis = requests.get(f"https://www.virustotal.com/api/v3/analyses/{analysis_id}", headers=HEADERS)
        analysis.raise_for_status()
        return analysis.json()
    except Exception as e:
        print(f"Error al analizar la URL: {e}")
        return {"error": str(e)}

@app.post("/check-fraud")
async def check_fraud(data: URLData):
    """
    Endpoint para verificar si una URL es fraudulenta.
    """
    url = data.url
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    # Escanear la URL y obtener el informe
    report = scan_and_get_report(url)

    # Determinar si la URL es fraudulenta
    if "data" in report and "attributes" in report["data"] and "stats" in report["data"]["attributes"]:
        stats = report["data"]["attributes"]["stats"]
        is_fraudulent = stats.get("malicious", 0) > 0
        return {"isFraudulent": is_fraudulent, "stats": stats}
    else:
        raise HTTPException(status_code=500, detail="Unable to analyze the URL")

barato = "gpt-4-32k"
demosigma = "gpt-4-turbo"

@app.post("/generate-description")
async def generate_description(data: HTMLBody):
    try:
        body = data.body
        if not body:
            raise HTTPException(status_code=400, detail="El body es requerido")

        # Llamada a la API de OpenAI para generar la descripción
        response = client.chat.completions.create(
            model=barato,  # Cambiar a un modelo que soporte más tokens
            messages=[
                {"role": "system", "content": "You are an AI assistant specialized in analyzing e-commerce transactions. Based on the HTML content of a payment gateway page, your goal is to determine exactly what is being purchased. Provide a concise and well-structured description of the purchase, including product names, quantities, and any other relevant details."},
                {"role": "user", "content": f"HTML Content: {body}\n\nPlease provide a concise and well-structured description of the purchase being made."}
            ],
            temperature=0.2,
            max_tokens=2000,
        )

        # Obtener la descripción generada
        description = response.choices[0].message.content

        # Mostrar la descripción generada por consola
        print("Generated Description:", description)

        return {"description": description}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ocurrió un error: {str(e)}")

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)