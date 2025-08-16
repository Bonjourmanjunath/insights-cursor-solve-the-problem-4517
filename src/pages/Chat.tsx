import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Send,
  Bot,
  User,
  Sparkles,
  Copy,
  Download,
  FileText
} from "lucide-react";

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  projectContext?: string;
}

const sampleMessages: ChatMessage[] = [
  {
    id: "1",
    type: "assistant",
    content: "Hello! I'm your FMR analysis assistant. I have context from your EVO ICL Patient Journey project. How can I help you with insights from your 12 processed transcripts?",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    projectContext: "EVO ICL Patient Journey"
  },
  {
    id: "2",
    type: "user",
    content: "Can you summarize the key unmet needs mentioned by patients?",
    timestamp: new Date(Date.now() - 1000 * 60 * 4)
  },
  {
    id: "3",
    type: "assistant",
    content: "Based on the transcript analysis, here are the key unmet needs identified:\n\n**Information & Education**\n- Patients need clearer understanding of biocompatibility benefits\n- Desire for more information about recovery timeline expectations\n\n**Reassurance & Support**\n- Need for confidence about reversibility of the procedure\n- Want validation about long-term safety profile\n\n**Access & Convenience**\n- Faster access to consultation and procedure scheduling\n- Clear communication about what to expect day-by-day post-procedure\n\nWould you like me to provide specific quotes supporting any of these themes?",
    timestamp: new Date(Date.now() - 1000 * 60 * 3)
  }
];

const suggestedQueries = [
  "Summarize insights for comms team",
  "Create slides for access strategy", 
  "List quotes related to patient delay",
  "What are the main barriers to adoption?",
  "Generate executive summary for leadership"
];

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(sampleMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProject] = useState("EVO ICL Patient Journey");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type: "user",
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type: "assistant",
        content: "I understand your question about the EVO ICL project. Based on the analyzed transcripts, I can provide insights on biocompatibility, recovery speed, and patient concerns. Would you like me to focus on any specific aspect?",
        timestamp: new Date(),
        projectContext: selectedProject
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 2000);
  };

  const handleSuggestedQuery = (query: string) => {
    setInputValue(query);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-foreground">Project Chat</h1>
        <p className="text-muted-foreground">
          AI-powered analysis assistant with full project context
        </p>
      </motion.div>

      {/* Project Context */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 dna-gradient rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {selectedProject}
                  </span>
                </CardTitle>
                <CardDescription className="text-base">
                  Patient Journey Analysis • Germany • 12 transcripts loaded • AI-Enhanced
                </CardDescription>
              </div>
              <Badge className="bg-gradient-to-r from-success to-success/80 text-white font-medium ai-glow">
                Context Active
              </Badge>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Chat Interface */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-card border-primary/20 h-[600px] flex flex-col neural-pattern">
          <CardHeader className="pb-3 border-b border-primary/10">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 dna-gradient rounded-lg">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                FMR AI Analysis Assistant
              </span>
            </CardTitle>
          </CardHeader>
          
          {/* Messages */}
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.type === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {message.type === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div className={`rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
                          <p className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                          {message.type === 'assistant' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-current/10"
                                onClick={() => copyToClipboard(message.content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-current/10"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted text-muted-foreground rounded-lg p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          
          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <div className="space-y-3">
              {/* Suggested Queries */}
              <div className="flex flex-wrap gap-2">
                {suggestedQueries.map((query, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleSuggestedQuery(query)}
                  >
                    {query}
                  </Button>
                ))}
              </div>
              
              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about your project insights..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}