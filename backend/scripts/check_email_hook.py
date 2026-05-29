import requests
import sys

def test_webhook():
    url = "http://localhost:8000/api/webhooks/email/inbound"
    payload = {
        "sender": "external_client@example.com",
        "subject": "Urgent: Server Down",
        "body": "My server is not responding since 5 AM."
    }
    
    try:
        print(f"Sending POST to {url}...")
        response = requests.post(url, json=payload)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Success! Ticket created via Email Webhook.")
        else:
            print("❌ Failed.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_webhook()
