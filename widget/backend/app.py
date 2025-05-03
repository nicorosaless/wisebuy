import os
import time
import requests
import openai
import json
import asyncio
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from bson import ObjectId
import jwt

# Cargar variables de entorno desde un archivo .env
load_dotenv()

# Configurar la clave de API para la API de OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("La variable de entorno OPENAI_API_KEY no está configurada.")
openai.api_key = OPENAI_API_KEY

app = FastAPI()
security = HTTPBearer()

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
        data = f"url={url}"
        resp = requests.post("https://www.virustotal.com/api/v3/urls", headers=HEADERS, data=data)
        resp.raise_for_status()
        analysis_id = resp.json()["data"]["id"]

        time.sleep(15)

        analysis = requests.get(f"https://www.virustotal.com/api/v3/analyses/{analysis_id}", headers=HEADERS)
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
transactions_collection = db["transacciones"]

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

# Replace the mock validate_token function with proper JWT validation
def validate_token(token: str) -> bool:
    try:
        # Decode the JWT token using the secret key
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Check if the required claims are present
        if "email" in decoded_token:
            # Optionally, verify the user exists in the database
            user = users_collection.find_one({"email": decoded_token["email"]})
            return user is not None
        return False
    except jwt.PyJWTError:
        return False

@app.post("/validate-token")
async def validate_token_endpoint(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    is_valid = validate_token(token)
    return {"valid": is_valid}

@app.get("/get-current-user")
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if "email" in decoded_token:
            return {"email": decoded_token["email"]}
        raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/get-user-goals")
async def get_user_goals(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if "email" in decoded_token:
            user = users_collection.find_one({"email": decoded_token["email"]})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Extract goals from user document
            goals = user.get("goals", [])
            
            # Return maximum of 3 goals
            return {"goals": goals[:3]}
        raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Modelo para actualizar transacciones
class TransactionUpdate(BaseModel):
    description: str

@app.get("/stream-transactions")
async def stream_transactions():
    """
    Endpoint que monitorea la colección de transacciones en MongoDB
    y envía un evento SOLO cuando aparece una nueva transacción.
    Una vez detectada y enviada una transacción, cierra la conexión.
    """
    async def event_generator():
        # Obtener la ID de la última transacción antes de empezar a monitorear
        last_transaction = transactions_collection.find_one(
            sort=[("_id", -1)]  # Ordenar por ID en orden descendente
        )
        
        last_id = str(last_transaction["_id"]) if last_transaction else None
        print(f"Iniciando monitoreo de transacciones posteriores a ID: {last_id}")
        
        # Loop hasta encontrar una nueva transacción
        while True:
            try:
                # Buscar solo transacciones más recientes que la última conocida
                query = {}
                if last_id:
                    query["_id"] = {"$gt": ObjectId(last_id)}
                    
                # Buscar transacciones no procesadas
                query["processed"] = {"$ne": True}
                
                # Buscar la próxima transacción nueva
                new_transaction = transactions_collection.find_one(
                    query,
                    sort=[("_id", 1)]  # Ordenar por ID de forma ascendente
                )
                
                if new_transaction:
                    print(f"Nueva transacción detectada: {new_transaction['_id']}")
                    
                    # Convertir ObjectId a string para serialización JSON
                    transaction_data = {
                        "_id": str(new_transaction["_id"]),
                        "amount": new_transaction.get("amount"),
                        "merchant": new_transaction.get("merchant"),
                        "date": new_transaction.get("date"),
                    }
                    
                    # Enviar el evento con los datos de la transacción
                    yield f"data: {json.dumps(transaction_data)}\n\n"
                    
                    # ¡Importante! Terminar el generador después de enviar una transacción
                    # Esto cierra la conexión SSE después de procesar una sola transacción
                    break
                
                # Pequeña pausa para evitar sobrecargar el servidor
                await asyncio.sleep(1)
                
            except Exception as e:
                print(f"Error en stream_transactions: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                break  # Terminar en caso de error
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )

@app.post("/update-transaction/{transaction_id}")
async def update_transaction(transaction_id: str, update_data: TransactionUpdate):
    """
    Actualiza una transacción con la descripción proporcionada y la marca como procesada.
    """
    try:
        # Convertir el string ID a ObjectId
        object_id = ObjectId(transaction_id)
        
        # Actualizar la transacción con la descripción y marcarla como procesada
        result = transactions_collection.update_one(
            {"_id": object_id},
            {"$set": {"description": update_data.description, "processed": True}}
        )
        
        if result.modified_count > 0:
            return {"success": True, "message": "Transacción actualizada correctamente"}
        else:
            return {"success": False, "message": "Transacción no encontrada o no modificada"}
    except Exception as e:
        return {"success": False, "message": str(e)}

# Endpoint para pruebas - agregar una nueva transacción
@app.post("/add-test-transaction")
async def add_test_transaction():
    """
    Añade una transacción de prueba a la colección de transacciones.
    Útil para probar el sistema de monitoreo de transacciones en tiempo real.
    """
    transaction = {
        "amount": 100.0,
        "merchant": "Tienda de Prueba",
        "date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "processed": False
    }
    result = transactions_collection.insert_one(transaction)
    return {"success": True, "transaction_id": str(result.inserted_id)}
