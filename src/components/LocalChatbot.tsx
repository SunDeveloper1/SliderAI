import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, X, Send, Brain, Cpu, ToggleLeft, 
  ToggleRight, Trash2
} from "lucide-react";
import { Slide } from "../types";
import { Agent, DEFAULT_AGENTS } from "./AiZone";

interface LocalChatbotProps {
  currentSlide: Slide | null;
  slideIndex: number;
}

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: Date;
  speed?: string;
  agentName?: string;
}

export default function LocalChatbot({ currentSlide, slideIndex }: LocalChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("agent-tutor");
  const [attachContext, setAttachContext] = useState(true);
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [telemetry, setTelemetry] = useState({ cpu: 12, vram: 1.8, speed: "0" });
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStorageUpdate = () => {
      const saved = localStorage.getItem("scribe_custom_agents");
      if (saved) {
        setAgents(JSON.parse(saved));
      }
    };

    handleStorageUpdate();
    window.addEventListener("storage", handleStorageUpdate);
    const interval = setInterval(handleStorageUpdate, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTelemetry({
        cpu: Math.floor(Math.random() * 10) + (isTyping ? 50 : 5),
        vram: parseFloat((1.8 + (Math.random() * 0.05)).toFixed(2)),
        speed: isTyping ? (Math.random() * 4 + 20).toFixed(1) : "0"
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [isOpen, isTyping]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: "user",
      text: messageInput.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setMessageInput("");
    setIsTyping(true);

    let slideContextText = "";
    if (attachContext && currentSlide) {
      slideContextText = `[Slide Title: ${currentSlide.title || `Slide ${slideIndex + 1}`}]\nSlide Content:\n${currentSlide.markdownContent || ""}`;
    }

    try {
      const response = await fetch("/api/ai/agent-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userMessage: userMsg.text,
          systemPrompt: activeAgent.systemPrompt,
          temperature: activeAgent.temperature,
          slideContext: slideContextText,
          chatHistory: messages.slice(-6)
        })
      });

      if (!response.ok) {
        throw new Error("Query failed");
      }

      const data = await response.json();
      
      const agentMsg: ChatMessage = {
        id: `msg-agent-${Date.now()}`,
        sender: "agent",
        text: data.text,
        timestamp: new Date(),
        speed: data.speed,
        agentName: activeAgent.name
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch (err: any) {
      console.error(err);
      setTimeout(() => {
        const fallbackMsg: ChatMessage = {
          id: `msg-agent-${Date.now()}`,
          sender: "agent",
          text: `[Local Fallback] I received your request.\n\nHere is a recommendation for "**${currentSlide?.title || `Slide ${slideIndex + 1}`}**":\n\nEnsure slide content is highly concise. Group ideas into short, actionable lists to maximize clarity and whitespace.`,
          timestamp: new Date(),
          speed: "12.0",
          agentName: activeAgent.name
        };
        setMessages(prev => [...prev, fallbackMsg]);
      }, 1000);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Mini Floating Chat Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 p-3.5 rounded-full shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer flex items-center justify-center relative"
          title="Open AI Chatbot"
        >
          <MessageSquare className="w-5 h-5" />
          {messages.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-indigo-500 text-white font-mono font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* Modern, Clean Chat Sidebar */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-full max-w-sm sm:max-w-md h-[480px] bg-slate-950 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none text-slate-100">
          
          {/* Header */}
          <header className="px-5 py-3.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-slate-400" />
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-widest font-mono text-slate-200">
                  Slide Assistant
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1 text-slate-600 hover:text-rose-400 rounded transition cursor-pointer"
                title="Clear Conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-100 rounded transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* Controls */}
          <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-900 flex items-center justify-between shrink-0 text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase tracking-wider">Agent:</span>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer text-[10px]"
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setAttachContext(prev => !prev)}
              className="flex items-center gap-1 hover:text-slate-300 text-slate-500 transition"
            >
              {attachContext ? (
                <ToggleRight className="w-4 h-4 text-indigo-500" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              <span>Context</span>
            </button>
          </div>

          {/* Telemetry Strip */}
          <div className="px-4 py-1 bg-slate-950 flex items-center justify-between shrink-0 border-b border-slate-900 text-[8px] font-mono text-slate-600">
            <span>CPU: {telemetry.cpu}%</span>
            <span>VRAM: {telemetry.vram} GB</span>
            <span>{isTyping ? "INFERENCE ACTIVE" : "IDLE"}</span>
          </div>

          {/* Context Attached Info */}
          {attachContext && currentSlide && (
            <div className="px-4 py-1.5 bg-slate-900/40 border-b border-slate-900/60 shrink-0 text-[10px] text-slate-400 truncate font-mono">
              📌 Context: "{currentSlide.title || "Untitled"}"
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-full max-w-[240px] mx-auto py-12">
                <Brain className="w-6 h-6 text-slate-800 mb-2" />
                <h4 className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-widest">Inference Ready</h4>
                <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">
                  Start typing to begin a secure, private learning chat session.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <span className="text-[8px] font-mono text-slate-600 mb-1 px-1">
                    {msg.sender === "user" ? "You" : msg.agentName || "Agent"}
                  </span>

                  <div 
                    className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-slate-800 text-slate-100"
                        : "bg-slate-900 border border-slate-800 text-slate-300"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.sender === "agent" && msg.speed && (
                      <div className="border-t border-slate-900 mt-2 pt-1 flex justify-between text-[8px] font-mono text-slate-600">
                        <span>{msg.speed} tok/s</span>
                        <span className="text-emerald-600">Cached</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-mono text-slate-600 mb-1 px-1">Thinking...</span>
                <div className="bg-slate-900 border border-slate-850 rounded-lg p-2.5 px-3.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Footer */}
          <form 
            onSubmit={handleSendMessage}
            className="p-3 bg-slate-950 border-t border-slate-900 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={`Message ${activeAgent.name}...`}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-700 transition-all"
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || isTyping}
              className={`p-2 rounded-lg transition cursor-pointer ${
                !messageInput.trim() || isTyping
                  ? "text-slate-700"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
