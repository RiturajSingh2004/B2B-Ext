from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime

app = Flask(__name__)
CORS(app)

AIRIA_URL = 'https://prodaus.api.airia.ai/v2/PipelineExecution/eacc757c-c433-414f-90b2-e40d7710e530'
AIRIA_HEADERS = {
    'Content-Type': 'application/json',
    'X-API-KEY': 'ak-MTg1MzA4MzE2OXwxNzU3NjY1Njg1ODQwfHRpLVJGTlZJRVJsZGtoaFkyc2dWR1Z1WVc1MElERTN8MXwyMTgxMDE3OTM3'
}

def format_chat_response(response):
    """Extract response from API response data"""
    try:
        if isinstance(response, list):
            # Look for AIOperation step output
            for step in response:
                if isinstance(step, dict) and step.get('stepType') == 'AIOperation':
                    return str(step.get('output', '')).strip()
            return str(response[-1].get('output', '')) if response else ''
        elif isinstance(response, dict):
            if 'result' in response:
                return str(response['result'])
        return str(response)
    except Exception as e:
        print(f"Error formatting response: {e}")
        return str(response)

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_input = data.get('userInput', '')
        conversation_history = data.get('conversationHistory', [])
        
        if not user_input:
            return jsonify({'error': 'No input provided'})
        
        # Filter conversation history
        filtered_history = [
            msg for msg in conversation_history 
            if msg['role'] in ('user', 'assistant') and 'content' in msg
        ]
        
        # Prepare payload for Airia API
        payload = {
            "userInput": user_input,
            "asyncOutput": False,
            "context": {
                "previousMessages": filtered_history,
                "metadata": {
                    "source": "browser_extension"
                }
            }
        }

        # Make request to Airia API
        response = requests.post(AIRIA_URL, headers=AIRIA_HEADERS, json=payload)
        
        if not response.ok:
            return jsonify({'error': f'API request failed with status code {response.status_code}'})
        
        # Format the response
        formatted_response = format_chat_response(response.json())
        
        return jsonify({
            'response': formatted_response,
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5000)