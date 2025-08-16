import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  Send,
  X,
  Bot,
  User,
  Mic,
  MicOff,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ErrorHandler, ErrorUtils, ERROR_CODES } from "@/lib/error-handler";

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const getQuickPromptsForProjectType = (projectType?: string) => {
  if (projectType === 'customer_journey') {
    return [
      "Summarize top emotional blockers",
      "Show unmet needs from behavioral drivers", 
      "Give me 1 quote per journey stage",
      "What are the key journey friction points?",
      "Compare touchpoints across stages"
    ];
  }
  
  if (projectType === 'patient_journey') {
    return [
      "What coping mechanisms did patients use?",
      "Show emotional impact on identity",
      "What system interactions frustrated patients?",
      "Compare pre vs post-diagnosis emotions",
      "Extract support system quotes"
    ];
  }
  
  if (projectType === 'diagnostic_pathway') {
    return [
      "What caused the longest delays?",
      "Show misdiagnosis patterns",
      "Extract system friction quotes",
      "Compare patient vs system delays",
      "What tests were most critical?"
    ];
  }
  
  if (projectType === 'persona_mapping') {
    return [
      "Show persona archetypes across respondents",
      "What motivates this persona type?",
      "Extract communication style patterns",
      "Compare risk perceptions",
      "What triggers decision-making?"
    ];
  }
  
  if (projectType === 'treatment_decision') {
    return [
      "What drove final treatment choices?",
      "Show emotional tradeoffs made",
      "Who were the key influencers?",
      "Extract decision confidence levels",
      "What barriers delayed decisions?"
    ];
  }
  
  if (projectType === 'unmet_needs') {
    return [
      "Rank unmet needs by urgency",
      "What are the clinical gaps?",
      "Show emotional support needs",
      "Extract system friction points",
      "What solutions were suggested?"
    ];
  }
  
  if (projectType === 'behavioral_drivers') {
    return [
      "What influences treatment behavior?",
      "Show resistance patterns",
      "Extract belief systems",
      "What triggers behavior change?",
      "How do social factors influence care?"
    ];
  }
  
  if (projectType === 'kol_mapping') {
    return [
      "What's the expert consensus?",
      "Show future outlook insights",
      "Extract strategic implications",
      "What unmet needs do KOLs highlight?",
      "Compare regional vs global perspectives"
    ];
  }

  // Product & Market Research Types
  if (projectType === 'product_positioning') {
    return [
      "How is the product perceived vs competitors?",
      "Extract key differentiators",
      "Show positioning objections",
      "What market fit signals exist?",
      "Extract credibility concerns"
    ];
  }

  if (projectType === 'product_potential') {
    return [
      "Show interest levels by stakeholder",
      "Extract adoption conditions",
      "What are the practical limitations?",
      "Show innovation readiness signals",
      "Compare ideal use cases"
    ];
  }

  if (projectType === 'market_potential') {
    return [
      "Extract market timing signals",
      "Show adoption barriers",
      "What education needs exist?",
      "Extract reimbursement readiness",
      "Compare risk levels"
    ];
  }

  if (projectType === 'market_understanding') {
    return [
      "Show knowledge gaps by stakeholder",
      "Extract terminology confusion",
      "What misunderstandings exist?",
      "Compare understanding levels",
      "Show communication needs"
    ];
  }

  if (projectType === 'launch_readiness') {
    return [
      "Extract readiness by stakeholder type",
      "Show training gaps",
      "What infrastructure needs exist?",
      "Extract timing concerns",
      "Compare confidence levels"
    ];
  }

  // Message & Material Testing Types
  if (projectType === 'message_testing') {
    return [
      "Show message clarity scores",
      "Extract emotional reactions",
      "What language needs changing?",
      "Show credibility concerns",
      "Compare memorability factors"
    ];
  }

  if (projectType === 'concept_testing') {
    return [
      "Show concept reactions by type",
      "Extract feasibility concerns",
      "What concepts resonate most?",
      "Show misunderstanding patterns",
      "Compare improvement suggestions"
    ];
  }

  if (projectType === 'material_testing') {
    return [
      "Show material usability scores",
      "Extract layout feedback",
      "What confuses users most?",
      "Show credibility assessments",
      "Compare behavioral impact"
    ];
  }

  if (projectType === 'visual_claims_testing') {
    return [
      "Show visual trust levels",
      "Extract believability concerns",
      "What claims seem exaggerated?",
      "Show cultural fit issues",
      "Compare recall likelihood"
    ];
  }

  if (projectType === 'story_flow') {
    return [
      "Show narrative flow issues",
      "Extract emotional journey patterns",
      "What engagement points work?",
      "Show authenticity concerns",
      "Compare trust impacts"
    ];
  }

  if (projectType === 'device_messaging') {
    return [
      "Show device trust levels",
      "Extract usability concerns",
      "What messaging confuses users?",
      "Show empowerment vs stigma",
      "Compare tech integration feedback"
    ];
  }

  if (projectType === 'co_creation') {
    return [
      "Show creative suggestions by theme",
      "Extract collaboration depth",
      "What design feedback emerged?",
      "Show ownership emotions",
      "Compare inclusion signals"
    ];
  }

  // Digital Experience Types
  if (projectType === 'touchpoint_experience') {
    return [
      "Show touchpoint satisfaction by channel",
      "Extract emotional barriers",
      "What improvements are needed?",
      "Show engagement impact",
      "Compare follow-up needs"
    ];
  }

  if (projectType === 'digital_usability') {
    return [
      "Show usability scores by tool",
      "Extract navigation issues",
      "What accessibility gaps exist?",
      "Show trust and security concerns",
      "Compare improvement priorities"
    ];
  }

  // Default prompts for other project types
  return [
    "What did HCPs say about barriers?",
    "Extract patient emotion quotes",
    "Compare perspectives", 
    "Generate summary",
    "Show key themes"
  ];
};

interface AIChatProps {
  project?: any;
  analysis?: any;
  quickPrompts?: string[];
}

export default function AIChat({ project, analysis, quickPrompts }: AIChatProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Generate dynamic welcome message based on available data
  const getWelcomeMessage = () => {
    // Check if analysis exists and has meaningful content (not just empty tables)
    const hasValidAnalysis = analysis && (
      (analysis.fmr_dish?.table && Array.isArray(analysis.fmr_dish.table) && 
       analysis.fmr_dish.table.length > 0 && 
       analysis.fmr_dish.table.some((row: any) => row.vashette || row.quote || row.summary)) ||
      (analysis.mode_analysis?.table && Array.isArray(analysis.mode_analysis.table) && 
       analysis.mode_analysis.table.length > 0 && 
       analysis.mode_analysis.table.some((row: any) => Object.values(row || {}).some(val => val))) ||
      (analysis.strategic_themes?.table && Array.isArray(analysis.strategic_themes.table) && 
       analysis.strategic_themes.table.length > 0 && 
       analysis.strategic_themes.table.some((row: any) => row.theme || row.rationale)) ||
      (analysis.summary?.content && analysis.summary.content.trim())
    );

    if (hasValidAnalysis) {
      return `Hello! I'm your qualitative research assistant for ${project?.name || 'your project'}. I have access to your analysis data and can help you explore insights, extract quotes, and identify themes. Try asking about barriers, themes, or specific findings!`;
    } else if (analysis) {
      return `Hello! I'm your qualitative research assistant. I can see analysis data exists but it appears to be empty. Please run a new analysis from the other tabs to generate insights, then return here to chat about your findings.`;
    } else {
      return `Hello! I'm your qualitative research assistant. No analysis data is available yet. Please run the FMR analysis first from the other tabs, then return here to chat about your insights.`;
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      type: "assistant", 
      content: getWelcomeMessage(),
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
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

    try {
      // Add detailed logging for debugging
      console.log('=== CHAT DEBUG ===');
      console.log('Project data:', project);
      console.log('Analysis data received:', analysis);
      console.log('Analysis structure check:');
      console.log('- fmr_dish exists:', !!analysis?.fmr_dish);
      console.log('- fmr_dish.table exists:', !!analysis?.fmr_dish?.table);
      console.log('- mode_analysis exists:', !!analysis?.mode_analysis);
      console.log('- strategic_themes exists:', !!analysis?.strategic_themes);
      console.log('- summary exists:', !!analysis?.summary);

      // Check if analysis exists
      if (!analysis) {
        throw new Error('No analysis data available. Please run the FMR analysis first.');
      }

      // Prepare analysis data for the chat - with better error handling
      const analysisData = {
        dishTable: analysis?.fmr_dish?.table && Array.isArray(analysis.fmr_dish.table) && analysis.fmr_dish.table.length > 0 
          ? JSON.stringify(analysis.fmr_dish.table) 
          : 'No FMR Dish data available',
        modeTable: analysis?.mode_analysis?.table && Array.isArray(analysis.mode_analysis.table) && analysis.mode_analysis.table.length > 0 
          ? JSON.stringify(analysis.mode_analysis.table) 
          : 'No mode analysis data available',
        strategicThemes: analysis?.strategic_themes?.table && Array.isArray(analysis.strategic_themes.table) && analysis.strategic_themes.table.length > 0 
          ? JSON.stringify(analysis.strategic_themes.table) 
          : 'No strategic themes available',
        analysisSummary: analysis?.summary?.content && analysis.summary.content.trim() 
          ? analysis.summary.content 
          : 'No summary available'
      };

      console.log('Prepared analysis data for API:', analysisData);

      console.log('Calling azure-openai-chat function with:', {
        message: inputValue,
        hasProject: !!project,
        hasAnalysis: !!analysisData,
        analysisKeys: Object.keys(analysisData)
      });

      // Send message with retry logic and error handling
      const data = await ErrorUtils.withRetry(async () => {
      const { data, error } = await supabase.functions.invoke('azure-openai-chat', {
        body: {
          message: inputValue,
          project: project,
          analysis: analysisData,
          conversationHistory: messages.slice(-10).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        }
      });

        if (error) throw error;

        if (!data || !data.message) {
          throw new Error('Invalid response from AI service');
        }

        return data;
      }, 3, {
        operation: 'send_chat_message',
        additionalData: { 
          hasAnalysis: !!analysis,
          projectType: project?.project_type 
        }
      });

      const assistantMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type: "assistant",
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error, {
        operation: 'send_chat_message',
        additionalData: { 
          hasAnalysis: !!analysis,
          projectType: project?.project_type 
        }
      });

      const errorMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type: "assistant",
        content: errorResponse.userMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  const downloadChat = () => {
    const chatContent = messages.map(msg => 
      `[${msg.timestamp.toLocaleString()}] ${msg.type.toUpperCase()}: ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${project?.name || 'conversation'}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      if (isListening) {
        recognition.stop();
        setIsListening(false);
      } else {
        recognition.start();
        setIsListening(true);
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };
      }
    }
  };

  // Update welcome message when analysis data changes
  useEffect(() => {
    setMessages(prev => [
      {
        ...prev[0],
        content: getWelcomeMessage()
      },
      ...prev.slice(1)
    ]);
  }, [analysis, project]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // For embedded chat (in tabs), render directly without floating window
  return (
    <div className="flex flex-col h-[350px] bg-background rounded-lg border border-border">
      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-primary' 
                    : 'bg-muted'
                }`}>
                  {message.type === 'user' ? (
                    <User className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className={`rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Quick Prompts and Download */}
      <div className="p-2 border-t border-border bg-muted/20">
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-wrap gap-1 flex-1">
            {(quickPrompts || getQuickPromptsForProjectType(project?.project_type)).slice(0, 3).map((prompt, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                className="text-xs h-6 px-2"
                onClick={() => handleQuickPrompt(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadChat}
            className="ml-2 h-6 px-2"
            title="Download chat history"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about your research analysis..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVoiceInput}
            className={`${isListening ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
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
  );
}