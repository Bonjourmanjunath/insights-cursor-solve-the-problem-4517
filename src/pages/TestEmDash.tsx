import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function TestEmDash() {
  const [results, setResults] = useState<string[]>([]);
  
  const addResult = (msg: string) => {
    setResults(prev => [...prev, `${new Date().toISOString()}: ${msg}`]);
  };
  
  const testFunctionCall = async () => {
    setResults([]);
    
    // Test 1: Direct string
    addResult("Test 1: Testing with direct string");
    try {
      const functionName1 = "content-analysis-queue";
      addResult(`Function name: "${functionName1}"`);
      addResult(`Char codes: ${functionName1.split('').map(c => c.charCodeAt(0)).join(', ')}`);
      
      const { data, error } = await supabase.functions.invoke(functionName1, {
        body: { test: true }
      });
      
      if (error) {
        addResult(`Error: ${JSON.stringify(error)}`);
      } else {
        addResult(`Success: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      addResult(`Exception: ${e}`);
    }
    
    // Test 2: Character code construction
    addResult("\nTest 2: Testing with character codes");
    try {
      const functionName2 = ["content", "analysis", "queue"].join(String.fromCharCode(45));
      addResult(`Function name: "${functionName2}"`);
      addResult(`Char codes: ${functionName2.split('').map(c => c.charCodeAt(0)).join(', ')}`);
      
      const { data, error } = await supabase.functions.invoke(functionName2, {
        body: { test: true }
      });
      
      if (error) {
        addResult(`Error: ${JSON.stringify(error)}`);
      } else {
        addResult(`Success: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      addResult(`Exception: ${e}`);
    }
    
    // Test 3: Check browser encoding
    addResult("\nTest 3: Browser encoding test");
    const testString = "content-analysis-queue";
    addResult(`Original: ${testString}`);
    addResult(`encodeURI: ${encodeURI(testString)}`);
    addResult(`encodeURIComponent: ${encodeURIComponent(testString)}`);
  };
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Em-Dash Bug Detector 🕵️‍♂️</CardTitle>
          <p className="text-muted-foreground">
            Testing if hyphens are being converted to em-dashes
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testFunctionCall}>
            Run Function Name Test
          </Button>
          
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {results.length > 0 ? results.join('\n') : 'Click the button to run tests...'}
            </pre>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>Hyphen (-): ASCII 45</p>
            <p>Em-dash (—): Unicode U+2014</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}