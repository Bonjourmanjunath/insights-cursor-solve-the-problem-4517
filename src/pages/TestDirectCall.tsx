import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function TestDirectCall() {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const testDirectCall = async () => {
    setLoading(true);
    setOutput("Testing...\n");
    
    try {
      // Check auth first
      const { data: { session } } = await supabase.auth.getSession();
      setOutput(prev => prev + `User ID: ${session?.user?.id || 'NOT LOGGED IN'}\n\n`);
      
      if (!session) {
        setOutput(prev => prev + "ERROR: You must be logged in first!\n");
        setLoading(false);
        return;
      }
      
      // Get a project
      const { data: projects, error: projError } = await supabase
        .from('research_projects')
        .select('id, name, user_id')
        .eq('user_id', session.user.id)
        .limit(1);
        
      if (projError || !projects?.length) {
        setOutput(prev => prev + `No projects found for your user: ${projError?.message || 'No projects'}\n`);
        setLoading(false);
        return;
      }
      
      const project = projects[0];
      setOutput(prev => prev + `Using project: ${project.name} (${project.id})\n`);
      setOutput(prev => prev + `Project owner: ${project.user_id}\n`);
      setOutput(prev => prev + `Match: ${project.user_id === session.user.id}\n\n`);
      
      // Call the function
      setOutput(prev => prev + "Calling content-analysis-queue...\n");
      
      const { data, error } = await supabase.functions.invoke('content-analysis-queue', {
        body: { project_id: project.id }
      });
      
      if (error) {
        setOutput(prev => prev + `\nERROR: ${JSON.stringify(error, null, 2)}\n`);
      } else {
        setOutput(prev => prev + `\nSUCCESS: ${JSON.stringify(data, null, 2)}\n`);
      }
      
    } catch (err) {
      setOutput(prev => prev + `\nEXCEPTION: ${err}\n`);
    }
    
    setLoading(false);
  };
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Direct Edge Function Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={testDirectCall} disabled={loading}>
            {loading ? "Testing..." : "Test Content Analysis Queue"}
          </Button>
          
          <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto text-xs">
            {output || "Click the button to test..."}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}