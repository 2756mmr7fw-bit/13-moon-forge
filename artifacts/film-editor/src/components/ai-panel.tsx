import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send } from "lucide-react";

export default function AiPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "ai", text: "I'm 13 Moons, your AI co-director. I can analyze pacing, suggest cuts, generate scratch VO, or find media. What are we working on today?" }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: "user", text: input }]);
    setInput("");

    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: "ai", 
        text: "Analyzing timeline... The pacing in the first 30 seconds feels a bit slow. Try trimming the establishing shot by 12 frames to match the beat of the audio track." 
      }]);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c]">
      <div className="h-10 shrink-0 border-b border-white/10 flex items-center px-4 gap-2 bg-black/40">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-medium text-white/90 text-sm tracking-wide">13 Moons AI</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-primary/20 text-primary-foreground border border-primary/20' 
                  : 'bg-white/5 text-white/80 border border-white/10'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 shrink-0 border-t border-white/10 bg-black/20">
        <form onSubmit={handleSubmit} className="relative">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the co-director..." 
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10 focus-visible:ring-primary/50"
          />
          <Button 
            type="submit" 
            size="icon" 
            variant="ghost" 
            className="absolute right-1 top-1 h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
