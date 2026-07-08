import React, { useState, useEffect } from "react";
import { 
  X, Cpu, Brain, Download, CheckCircle, Plus, Trash2, 
  Settings, Zap, Sparkles, Sliders, Database, Server
} from "lucide-react";

export interface LocalModel {
  id: string;
  name: string;
  provider: string;
  size: string;
  vram: string;
  description: string;
  speed: string;
}

export interface Agent {
  id: string;
  name: string;
  baseModelId: string;
  systemPrompt: string;
  temperature: number;
  role: string;
  color: string;
}

interface AiZoneProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PRESET_MODELS: LocalModel[] = [
  {
    id: "gemma-2b",
    name: "Gemma 2B Instruct",
    provider: "Google",
    size: "1.4 GB",
    vram: "2.1 GB",
    speed: "25-30 tok/s",
    description: "Highly optimized lightweight model built by Google, perfect for browser CPU & WebGPU inference."
  },
  {
    id: "phi-3-mini",
    name: "Phi-3 Mini Instruct",
    provider: "Microsoft",
    size: "2.2 GB",
    vram: "3.2 GB",
    speed: "18-22 tok/s",
    description: "Exceptional reasoning capabilities for its size. Outperforms models twice its weight in logical tasks."
  },
  {
    id: "llama-3-8b",
    name: "Llama 3 8B (q4)",
    provider: "Meta",
    size: "4.3 GB",
    vram: "5.5 GB",
    speed: "12-15 tok/s",
    description: "High-intelligence flagship model. Requires decent system RAM or WebGPU memory allocations."
  },
  {
    id: "qwen-1.5b",
    name: "Qwen 2 1.5B Chat",
    provider: "Alibaba",
    size: "0.9 GB",
    vram: "1.3 GB",
    speed: "35-42 tok/s",
    description: "Ultra-compact chat companion, outstanding in formatting markdown code and multiple languages."
  },
  {
    id: "tinyllama-1.1b",
    name: "TinyLlama 1.1B",
    provider: "Community",
    size: "0.6 GB",
    vram: "0.9 GB",
    speed: "45-55 tok/s",
    description: "Extremely fast execution, designed to run smoothly on any device without noticeable lag."
  }
];

export const DEFAULT_AGENTS: Agent[] = [
  {
    id: "agent-tutor",
    name: "Socratic Slide Tutor",
    baseModelId: "gemma-2b",
    systemPrompt: "You are a friendly Socratic learning assistant. Read the current presentation slide context and prompt the user with insightful, guiding questions that help them understand the subject matter. Never directly give the correct answers immediately. Help them explore.",
    temperature: 0.7,
    role: "Deep conceptual guidance & interactive questioning",
    color: "from-slate-300 to-slate-400"
  },
  {
    id: "agent-optimizer",
    name: "Markdown Architect",
    baseModelId: "qwen-1.5b",
    systemPrompt: "You are an expert technical editor. Critically review the slide layout and content. Suggest major text reductions, bullet point structural adjustments, or better code formatting options to improve high-contrast readability.",
    temperature: 0.4,
    role: "Slide brevity, structural visual improvements",
    color: "from-indigo-400 to-indigo-500"
  }
];

export default function AiZone({ isOpen, onClose }: AiZoneProps) {
  const [activeTab, setActiveTab] = useState<"hub" | "agents">("hub");
  
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("scribe_local_models_progress");
    return saved ? JSON.parse(saved) : { "gemma-2b": 100 };
  });
  
  const [downloadStatus, setDownloadStatus] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem("scribe_local_models_status");
    return saved ? JSON.parse(saved) : { "gemma-2b": "Ready" };
  });

  const [activeDownloading, setActiveDownloading] = useState<string | null>(null);

  const [agents, setAgents] = useState<Agent[]>(() => {
    const saved = localStorage.getItem("scribe_custom_agents");
    return saved ? JSON.parse(saved) : DEFAULT_AGENTS;
  });

  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentBaseModel, setNewAgentBaseModel] = useState("gemma-2b");
  const [newAgentPrompt, setNewAgentPrompt] = useState("");
  const [newAgentRole, setNewAgentRole] = useState("");
  const [newAgentTemp, setNewAgentTemp] = useState(0.7);

  useEffect(() => {
    localStorage.setItem("scribe_local_models_progress", JSON.stringify(downloadProgress));
    localStorage.setItem("scribe_local_models_status", JSON.stringify(downloadStatus));
  }, [downloadProgress, downloadStatus]);

  useEffect(() => {
    localStorage.setItem("scribe_custom_agents", JSON.stringify(agents));
  }, [agents]);

  if (!isOpen) return null;

  const startDownload = (modelId: string) => {
    if (activeDownloading) return;
    setActiveDownloading(modelId);
    setDownloadProgress(prev => ({ ...prev, [modelId]: 0 }));
    setDownloadStatus(prev => ({ ...prev, [modelId]: "Downloading..." }));

    let currentPct = 0;
    const interval = setInterval(() => {
      currentPct += Math.floor(Math.random() * 8) + 5;
      if (currentPct >= 100) {
        currentPct = 100;
        clearInterval(interval);
        
        setDownloadProgress(prev => ({ ...prev, [modelId]: 100 }));
        setDownloadStatus(prev => ({ ...prev, [modelId]: "Verifying..." }));

        setTimeout(() => {
          setDownloadStatus(prev => ({ ...prev, [modelId]: "Ready" }));
          setActiveDownloading(null);
        }, 1000);
      } else {
        setDownloadProgress(prev => ({ ...prev, [modelId]: currentPct }));
        setDownloadStatus(prev => ({ ...prev, [modelId]: `Downloading (${currentPct}%)` }));
      }
    }, 150);
  };

  const deleteModel = (modelId: string) => {
    if (modelId === "gemma-2b") return;
    const updatedProg = { ...downloadProgress };
    const updatedStat = { ...downloadStatus };
    delete updatedProg[modelId];
    delete updatedStat[modelId];
    setDownloadProgress(updatedProg);
    setDownloadStatus(updatedStat);
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentPrompt.trim()) return;

    const colors = [
      "from-zinc-300 to-zinc-400",
      "from-slate-300 to-slate-400",
      "from-indigo-400 to-indigo-500",
      "from-teal-400 to-teal-500",
      "from-sky-400 to-sky-500"
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newAgent: Agent = {
      id: `custom-agent-${Date.now()}`,
      name: newAgentName,
      baseModelId: newAgentBaseModel,
      systemPrompt: newAgentPrompt,
      role: newAgentRole || "Custom specialized task companion",
      temperature: newAgentTemp,
      color: randomColor
    };

    setAgents(prev => [...prev, newAgent]);
    
    setNewAgentName("");
    setNewAgentPrompt("");
    setNewAgentRole("");
    setNewAgentTemp(0.7);
    setActiveTab("agents");
  };

  const handleDeleteAgent = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 md:p-6 overflow-hidden select-none">
      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header bar */}
        <header className="px-6 py-4 bg-slate-950 border-b border-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-slate-300">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest font-mono text-slate-200">
                AI Agent Hub
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                Deploy private, browser-cached language models for localized support
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-100 hover:bg-slate-900 rounded-md transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Minimalist Tabs */}
        <div className="flex bg-slate-950 px-6 py-1 border-b border-slate-900 shrink-0 gap-4">
          <button
            onClick={() => setActiveTab("hub")}
            className={`flex items-center gap-2 py-3 text-[11px] font-bold uppercase tracking-wider transition relative cursor-pointer ${
              activeTab === "hub" ? "text-slate-100" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>LLM Library</span>
            {activeTab === "hub" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("agents")}
            className={`flex items-center gap-2 py-3 text-[11px] font-bold uppercase tracking-wider transition relative cursor-pointer ${
              activeTab === "agents" ? "text-slate-100" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Custom Agents</span>
            {activeTab === "agents" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {activeTab === "hub" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Models List */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <h3 className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Server className="w-3 h-3 text-slate-500" />
                  <span>Available local models</span>
                </h3>

                <div className="flex flex-col gap-3">
                  {PRESET_MODELS.map(model => {
                    const progress = downloadProgress[model.id] ?? 0;
                    const status = downloadStatus[model.id] || "Available";
                    const isReady = status === "Ready";
                    const isDownloading = progress > 0 && progress < 100;

                    return (
                      <div 
                        key={model.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isReady 
                            ? "bg-slate-900/30 border-slate-800/80"
                            : "bg-slate-900/10 border-slate-900 hover:border-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-xs text-slate-200">{model.name}</span>
                              <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 font-mono px-1.5 py-0.5 rounded">
                                {model.provider}
                              </span>
                              {isReady && (
                                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                                  ● Cached
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              {model.description}
                            </p>
                          </div>

                          <div className="shrink-0 flex flex-col items-end text-[10px] font-mono">
                            <span className="text-slate-400">{model.size}</span>
                            <span className="text-slate-600">VRAM: {model.vram}</span>
                          </div>
                        </div>

                        {/* Progress or Controller */}
                        <div className="mt-3.5 flex items-center gap-4 border-t border-slate-900 pt-3">
                          {isReady ? (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                Model is cached locally
                              </span>
                              {model.id !== "gemma-2b" && (
                                <button
                                  onClick={() => deleteModel(model.id)}
                                  className="text-[10px] font-mono text-slate-600 hover:text-rose-400 transition cursor-pointer"
                                >
                                  Uncache
                                </button>
                              )}
                            </div>
                          ) : isDownloading ? (
                            <div className="w-full flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-indigo-400">{status}</span>
                                <span className="text-slate-400">{progress}%</span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden border border-slate-800">
                                <div 
                                  className="bg-indigo-500 h-full rounded-full transition-all duration-150"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[10px] font-mono text-slate-600">
                                Rating: ~{model.speed}
                              </span>
                              <button
                                onClick={() => startDownload(model.id)}
                                disabled={!!activeDownloading}
                                className="flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-medium border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300 transition cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>Cache</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resource Metrics */}
              <div className="flex flex-col gap-4">
                <h3 className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Cpu className="w-3 h-3 text-slate-500" />
                  <span>Telemetry</span>
                </h3>

                <div className="bg-slate-900/30 border border-slate-850 p-5 rounded-xl flex flex-col gap-5">
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono mb-1.5">
                      <span className="text-slate-500">VRAM Allocation</span>
                      <span className="text-slate-300">
                        {(Object.keys(downloadStatus).filter(id => downloadStatus[id] === "Ready").reduce((acc, id) => {
                          const m = PRESET_MODELS.find(x => x.id === id);
                          return acc + (m ? parseFloat(m.vram) : 0);
                        }, 0)).toFixed(1)} GB / 8.0 GB
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1 border border-slate-850">
                      <div 
                        className="bg-indigo-500/80 h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(Object.keys(downloadStatus).filter(id => downloadStatus[id] === "Ready").reduce((acc, id) => {
                            const m = PRESET_MODELS.find(x => x.id === id);
                            return acc + (m ? parseFloat(m.vram) : 0);
                            }, 0) / 8.0) * 100}%` 
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono mb-1.5">
                      <span className="text-slate-500">Execution Speed Limit</span>
                      <span className="text-slate-400">35 tok/s</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1 border border-slate-850">
                      <div className="bg-slate-500 h-full rounded-full" style={{ width: "65%" }} />
                    </div>
                  </div>

                  <div className="border-t border-slate-900 pt-4 mt-1 flex flex-col gap-2.5 text-[10px] font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-500/80" />
                      <span>WebGPU Status: <span className="text-emerald-400 font-bold uppercase text-[9px] px-1 border border-emerald-400/20 bg-emerald-400/5 rounded">Active</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-slate-500" />
                      <span>CPU Threads: <span className="text-slate-300 font-semibold">8 threads allocated</span></span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === "agents" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Build Custom Agent Form */}
              <div className="bg-slate-900/20 border border-slate-850 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                  <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                  <h3 className="text-[10px] font-bold font-mono text-slate-300 uppercase tracking-widest">
                    Assemble Agent
                  </h3>
                </div>

                <form onSubmit={handleCreateAgent} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[9px] font-bold uppercase font-mono tracking-widest text-slate-500 block mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      placeholder="e.g., Code Companion"
                      className="w-full bg-slate-900 border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold uppercase font-mono tracking-widest text-slate-500 block mb-1">
                      Base Model
                    </label>
                    <select
                      value={newAgentBaseModel}
                      onChange={(e) => setNewAgentBaseModel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-700 cursor-pointer"
                    >
                      {PRESET_MODELS.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold uppercase font-mono tracking-widest text-slate-500 block mb-1">
                      Specialty
                    </label>
                    <input
                      type="text"
                      value={newAgentRole}
                      onChange={(e) => setNewAgentRole(e.target.value)}
                      placeholder="e.g., Explaining code snippets"
                      className="w-full bg-slate-900 border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold uppercase font-mono tracking-widest text-slate-500 block mb-1">
                      System Prompt
                    </label>
                    <textarea
                      required
                      value={newAgentPrompt}
                      onChange={(e) => setNewAgentPrompt(e.target.value)}
                      placeholder="Instruct your agent how to speak and act..."
                      className="w-full bg-slate-900 border border-slate-800/80 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-slate-700 h-24 resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase font-mono tracking-widest text-slate-500 mb-1">
                      <span>Temperature</span>
                      <span>{newAgentTemp}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.2"
                      step="0.1"
                      value={newAgentTemp}
                      onChange={(e) => setNewAgentTemp(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2 rounded-lg text-xs uppercase tracking-wider transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Agent</span>
                  </button>
                </form>
              </div>

              {/* Custom Agents List Grid */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <h3 className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Brain className="w-3 h-3 text-slate-500" />
                  <span>My Deployed Agents ({agents.length})</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agents.map(agent => {
                    const baseModel = PRESET_MODELS.find(m => m.id === agent.baseModelId);
                    const isCached = downloadStatus[agent.baseModelId] === "Ready";

                    return (
                      <div 
                        key={agent.id}
                        className="bg-slate-900/10 border border-slate-900 hover:border-slate-800 p-4 rounded-xl flex flex-col justify-between group transition-all"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-semibold text-slate-200">
                              {agent.name}
                            </span>
                            <button
                              onClick={() => handleDeleteAgent(agent.id)}
                              className="text-slate-600 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mt-1 block">
                            Role: {agent.role}
                          </span>

                          <p className="text-[11px] text-slate-400 font-mono line-clamp-3 mt-3 bg-slate-900/30 p-2 rounded-lg border border-slate-900 leading-relaxed">
                            {agent.systemPrompt}
                          </p>
                        </div>

                        <div className="border-t border-slate-900 mt-4 pt-2.5 flex justify-between items-center text-[10px] font-mono">
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-600">BRAIN</span>
                            <span className="text-slate-400">
                              {baseModel?.name || "Gemma 2B"}
                            </span>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-[8px] text-slate-600">STATUS</span>
                            <span className={isCached ? "text-emerald-400" : "text-amber-500/80"}>
                              {isCached ? "WebGPU" : "Proxy fallback"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
