from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

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
