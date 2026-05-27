"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  role: string;
  content: string;
}

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/chat");
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    
    // Optimistic UI
    const tempId = Date.now().toString();
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (data.id) {
        setMessages((prev) => [...prev, data]);
      } else {
        // If error, remove optimistic message
        setMessages((prev) => prev.filter(m => m.id !== tempId));
        alert(data.error || "Failed to send message");
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    await fetch("/api/chat", { method: "DELETE" });
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden border border-gray-300">
        
        {/* Header - Classic MSN / AIM style */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 flex justify-between items-center shadow-md">
          <div>
            <h1 className="text-xl font-bold tracking-wide">AIBot Messenger</h1>
            <p className="text-xs text-blue-100">Classic Web Edition</p>
          </div>
          <button 
            onClick={clearChat}
            className="text-xs bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded shadow-inner transition-colors"
          >
            Clear History
          </button>
        </div>

        {/* Chat Area */}
        <div className="h-[60vh] overflow-y-auto p-6 bg-[#f9fafc]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
              <div className="w-16 h-16 border-4 border-gray-200 rounded-full flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <p>Say hello to AIBot!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${
                    msg.role === "user" 
                      ? "bg-blue-500 text-white rounded-br-none" 
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  <div className="text-xs font-semibold mb-1 opacity-70">
                    {msg.role === "user" ? "You" : "AIBot"}
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white text-gray-500 border border-gray-200 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-2">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>●</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="bg-gray-100 p-4 border-t border-gray-300">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed active:transform active:scale-95"
            >
              Send
            </button>
          </form>
        </div>
        
      </div>
    </div>
  );
}
