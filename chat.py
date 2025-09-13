import requests
import json
import sys
from typing import Dict, Optional
from datetime import datetime

def make_request(user_input: str, conversation_history: list) -> Optional[Dict]:
    url = 'https://prodaus.api.airia.ai/v2/PipelineExecution/eacc757c-c433-414f-90b2-e40d7710e530'
    
    headers = {
        'Content-Type': 'application/json',
        'X-API-KEY': 'ak-MTg1MzA4MzE2OXwxNzU3NjY1Njg1ODQwfHRpLVJGTlZJRVJsZGtoaFkyc2dWR1Z1WVc1MElERTN8MXwyMTgxMDE3OTM3'
    }
    
    filtered_history = [
        msg for msg in conversation_history 
        if msg['role'] in ('user', 'assistant') and 'content' in msg
    ]
    
    payload = {
        "userInput": user_input,
        "asyncOutput": False,
        "context": {
            "previousMessages": filtered_history,
            "metadata": {
                "source": "chat_interface"
            }
        }
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if not response.ok:
            print(f"\nError: Request failed with status code {response.status_code}")
            return None
            
        return response.json()
        
    except requests.RequestException as e:
        print(f"\nError making request: {str(e)}")
        return None

def format_chat_response(response: Dict) -> str:
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

def chat_interface():
    """Interactive chat interface for the API"""
    # Print welcome message
    print("\n" + "="*50)
    print("Welcome to the Chat Interface!")
    print("Type 'exit' or 'quit' to end the chat")
    print("Type 'clear' to start a new conversation")
    print("="*50 + "\n")
    
    # Initialize conversation context
    conversation_history = []

    chat_history = []
    
    while True:
        try:
            # Get user input
            user_input = input("\nYou: ").strip()
            
            # Check for exit command
            if user_input.lower() in ['exit', 'quit', 'q']:
                print("\nGoodbye!")
                break
                
            # Skip empty messages
            if not user_input:
                print("Please type a message.")
                continue
                
            # Store the interaction time
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
            # Check for clear command
            if user_input.lower() == 'clear':
                conversation_history = []
                print("\nConversation history cleared. Starting new conversation.")
                continue

            # Send request to API
            print("\nThinking...")
            response = make_request(user_input, conversation_history)
            
            if response:
                # Format and display the response
                formatted_response = format_chat_response(response)
                print(f"\nAssistant: {formatted_response}")
                
                # Store the interaction
                conversation_history.append({
                    'role': 'user',
                    'content': user_input,
                    'timestamp': timestamp
                })
                conversation_history.append({
                    'role': 'assistant',
                    'content': formatted_response,
                    'timestamp': timestamp
                })
            else:
                print("\nSorry, I couldn't process your message. Please try again.")
                
        except KeyboardInterrupt:
            print("\nChat ended by user.")
            break
        except Exception as e:
            print(f"\nAn error occurred: {str(e)}")
            print("Please try again.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Single request mode
        user_input = " ".join(sys.argv[1:])
        print(f"\nSending request: {user_input}")
        result = make_request(user_input, [])  # Empty conversation history for single requests
        if result:
            print("\nResponse:", format_chat_response(result))
    else:
        # Interactive chat mode
        chat_interface()