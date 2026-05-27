import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AIBot Simple")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    message: str

# In-memory history for simplicity (resets when server restarts)
chat_history = []

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/api/history")
async def get_history():
    return chat_history

@app.post("/api/chat")
async def chat(msg: ChatMessage):
    if not msg.message:
        raise HTTPException(status_code=400, detail="Message is required")
        
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is missing or invalid in .env")

    # Add user message to history
    user_msg = {"role": "user", "content": msg.message}
    chat_history.append(user_msg)

    try:
        client = genai.Client(api_key=api_key)
        
        # Prepare history for Gemini
        contents = []
        for h in chat_history[-10:]:  # Keep last 10 messages for context
            contents.append({
                "role": h["role"],
                "parts": [{"text": h["content"]}]
            })
            
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=contents
        )
        
        ai_text = response.text or "I couldn't process that."
        
        ai_msg = {"role": "model", "content": ai_text}
        chat_history.append(ai_msg)
        
        return ai_msg
    except Exception as e:
        # Remove the user message if it failed
        chat_history.pop()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/history")
async def clear_history():
    chat_history.clear()
    return {"status": "cleared"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
