import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function SimpleTest() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testGuideParser = async () => {
    if (!text.trim()) {
      toast({
        title: "❌ No text provided",
        description: "Please enter some guide text to test",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('🧪 Testing guide-parser with text:', text.substring(0, 100) + '...');
      
      const { data, error } = await supabase.functions.invoke('guide-parser', {
        body: { text }
      });

      if (error) {
        console.error('❌ Guide parser error:', error);
        toast({
          title: "❌ Guide Parser Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Guide parser result:', data);
      setResult(data);
      
      toast({
        title: "✅ Guide Parsed Successfully!",
        description: `Found ${data?.guide?.sections?.length || 0} sections`,
      });

    } catch (err) {
      console.error('❌ Test error:', err);
      toast({
        title: "❌ Test Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Simple Guide Parser Test</CardTitle>
          <CardDescription>
            Test the guide-parser Edge Function with sample text
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Guide Text:</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your discussion guide text here..."
              rows={8}
              className="mt-2"
            />
          </div>

          <Button 
            onClick={testGuideParser} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "🔄 Testing..." : "🧪 Test Guide Parser"}
          </Button>

          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">✅ Result:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 