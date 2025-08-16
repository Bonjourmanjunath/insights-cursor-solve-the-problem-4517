import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Send, 
  Settings, 
  TestTube, 
  Download, 
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { chatGPTTeamService, ChatGPTTeamRequest } from '@/services/chatgpt-team-service';
import { getCustomGPTByUseCase, CustomGPT } from '@/lib/chatgpt-team-config';

interface ChatGPTTeamIntegrationProps {
  project?: any;
  analysis?: any;
  transcript?: any;
  onExport?: (content: string, format: string) => void;
}

export default function ChatGPTTeamIntegration({ 
  project, 
  analysis, 
  transcript, 
  onExport 
}: ChatGPTTeamIntegrationProps) {
  const { toast } = useToast();
  const [selectedGPT, setSelectedGPT] = useState<string>('');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [availableGPTs, setAvailableGPTs] = useState<CustomGPT[]>([]);
  const [useCase, setUseCase] = useState<CustomGPT['useCase']>('chat');

  useEffect(() => {
    loadAvailableGPTs();
    testConnection();
  }, []);

  useEffect(() => {
    // Update available GPTs when use case changes
    const gpts = getCustomGPTByUseCase(useCase);
    setAvailableGPTs(gpts);
    if (gpts.length > 0 && !selectedGPT) {
      setSelectedGPT(gpts[0].id);
    }
  }, [useCase]);

  const loadAvailableGPTs = () => {
    const gpts = getCustomGPTByUseCase(useCase);
    setAvailableGPTs(gpts);
    if (gpts.length > 0) {
      setSelectedGPT(gpts[0].id);
    }
  };

  const testConnection = async () => {
    try {
      const result = await chatGPTTeamService.testConnection();
      setIsConnected(result.success);
      
      if (!result.success) {
        toast({
          title: "ChatGPT Team Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      setIsConnected(false);
      toast({
        title: "Connection Test Failed",
        description: "Unable to connect to ChatGPT Team",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedGPT) return;

    setIsLoading(true);
    setResponse('');

    try {
      const request: ChatGPTTeamRequest = {
        gptId: selectedGPT,
        message: message,
        context: {
          project,
          analysis,
          transcript
        },
        options: {
          temperature: 0.7,
          maxTokens: 2000
        }
      };

      const result = await chatGPTTeamService.sendMessage(request);

      if (result.success) {
        setResponse(result.message);
        toast({
          title: "Message Sent Successfully",
          description: `Response from ${result.gptUsed}`,
        });
      } else {
        throw new Error(result.error || 'Failed to get response');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: string) => {
    if (response && onExport) {
      onExport(response, format);
      toast({
        title: "Exported Successfully",
        description: `Response exported as ${format}`,
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(response);
      toast({
        title: "Copied to Clipboard",
        description: "Response copied successfully",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getUseCaseLabel = (useCase: CustomGPT['useCase']) => {
    const labels = {
      analysis: 'Analysis',
      transcription: 'Transcription',
      chat: 'Chat',
      export: 'Export',
      general: 'General'
    };
    return labels[useCase] || useCase;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              ChatGPT Team Integration
            </CardTitle>
            <CardDescription>
              Use your team's custom GPTs for enhanced analysis and insights
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Disconnected
                </>
              )}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={isLoading}
            >
              <TestTube className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Use Case Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Use Case</label>
          <Select value={useCase} onValueChange={(value: CustomGPT['useCase']) => setUseCase(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select use case" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="analysis">Analysis</SelectItem>
              <SelectItem value="transcription">Transcription</SelectItem>
              <SelectItem value="chat">Chat</SelectItem>
              <SelectItem value="export">Export</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* GPT Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Custom GPT</label>
          <Select value={selectedGPT} onValueChange={setSelectedGPT}>
            <SelectTrigger>
              <SelectValue placeholder="Select a custom GPT" />
            </SelectTrigger>
            <SelectContent>
              {availableGPTs.map((gpt) => (
                <SelectItem key={gpt.id} value={gpt.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{gpt.name}</span>
                    <span className="text-xs text-muted-foreground">{gpt.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            placeholder="Ask your custom GPT a question..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            disabled={isLoading || !isConnected}
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !isConnected || !message.trim() || !selectedGPT}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send to Custom GPT
            </>
          )}
        </Button>

        {/* Response Display */}
        {response && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Response</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('txt')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
            <ScrollArea className="h-64 w-full rounded-md border p-4">
              <div className="whitespace-pre-wrap text-sm">{response}</div>
            </ScrollArea>
          </div>
        )}

        {/* Connection Status */}
        {!isConnected && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                ChatGPT Team is not connected. Please check your API configuration.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 