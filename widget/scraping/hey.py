import requests
from flask import Flask, request, jsonify

from groq import Client

app = Flask(__name__)

@app.route('/generate-description', methods=['POST'])
def generate_description():
    try:
        # Leer el body de la página enviado en la solicitud
        body = request.json.get('body', '')
        if not body:
            return jsonify({"error": "El body es requerido"}), 400

        # Llamada al modelo LLM para generar la descripción
        client = ...  # Inicializar el cliente del modelo LLM
        summary_response = client.chat.completions.create(
            model="deepseek-r1-distill-llama-70b",
            messages=[
                {"role": "system", "content": "You are an AI assistant specialized in summarizing academic papers. Provide a concise and well-structured summary of the paper."},
                {"role": "user", "content": f"Content: {body}\n\nPlease provide a concise and well-structured summary of this content."}
            ],
            temperature=0.2,
            max_tokens=8000,
            top_p=0.2,
            stream=True
        )

        # Procesar la respuesta del modelo
        description = "".join([chunk["choices"][0]["delta"]["content"] for chunk in summary_response])

        return jsonify({"description": description})

    except Exception as e:
        return jsonify({"error": "Ocurrió un error", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)