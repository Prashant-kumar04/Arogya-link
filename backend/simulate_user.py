import requests
import time
import random
import argparse
import json

def simulate_vitals(user_id, api_url):
    print(f"Starting simulation for User: {user_id}")
    print(f"Targeting API: {api_url}")
    
    endpoint = f"{api_url}/device/data"
    
    while True:
        vitals = {
            "user_id": user_id,
            "device_type": "smartwatch_emulator",
            "device_id": f"emu_{user_id}",
            "heart_rate": random.randint(65, 120),
            "spo2": random.uniform(96, 99.9),
            "bp_sys": random.randint(110, 150),
            "bp_dia": random.randint(70, 95),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        
        try:
            response = requests.post(endpoint, json=vitals)
            if response.status_code == 200:
                print(f"[{time.strftime('%H:%M:%S')}] OK: HR {vitals['heart_rate']} | BP {vitals['bp_sys']}/{vitals['bp_dia']} Sent for {user_id}")
            else:
                print(f"Failed to send: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Error: {e}")
            
        time.sleep(5)  # Send every 5 seconds

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", default="global", help="User ID from QR code")
    parser.add_argument("--url", default="http://localhost:3001", help="Base URL of the hosted backend")
    args = parser.parse_args()
    
    # Simple check to prepend http if missing
    url = args.url
    if not url.startswith("http"):
        url = "http://" + url
        
    simulate_vitals(args.user_id, url)
