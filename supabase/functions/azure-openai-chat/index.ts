import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  project?: any;
  analysis?: {
    dishTable: string;
    modeTable: string;
    strategicThemes: string;
    analysisSummary: string;
  };
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, project, analysis, conversationHistory = [] }: ChatRequest = await req.json();

    const AZURE_API_KEY = Deno.env.get('FMR_AZURE_OPENAI_API_KEY');
    const AZURE_ENDPOINT = Deno.env.get('FMR_AZURE_OPENAI_ENDPOINT');
    const DEPLOYMENT = "gpt-4.1";
    const API_VERSION = "2025-01-01-preview";

    if (!AZURE_API_KEY || !AZURE_ENDPOINT) {
      console.error('Missing Azure OpenAI configuration:', { 
        hasApiKey: !!AZURE_API_KEY, 
        hasEndpoint: !!AZURE_ENDPOINT 
      });
      throw new Error('Azure OpenAI configuration missing in secrets');
    }

    console.log('Azure OpenAI configuration loaded successfully');

    // Generate dynamic prompt using the sophisticated template
    const generateChatPrompt = (projectData: any, analysisData: any) => {
      const projectName = projectData?.name || 'Unknown Project';
      const stakeholderType = projectData?.stakeholder_type || 'Healthcare';
      const projectType = projectData?.project_type || 'Research';
      const therapyArea = projectData?.therapy_area || 'General Healthcare';
      const country = projectData?.country || 'Global';
      const transcriptFormat = 'Interview transcripts';
      const guideContext = 'Qualitative research interviews';
      
      return `
You are a senior healthcare qualitative strategist at FMR Global Health.

Your role is to assist the user with interpreting and applying insights from a previously completed qualitative project. You must not hallucinate beyond the data.

---

📁 PROJECT CONTEXT:

- Project Name: ${projectName}
- Stakeholder Type: ${stakeholderType}  (HCP / Patient / Payer / Internal)
- Project Type: ${projectType}
- Therapy Area: ${therapyArea}
- Country: ${country}
- Transcript Format: ${transcriptFormat}
- Guide Summary: ${guideContext}

---

📊 COMPLETED ANALYSIS (ALREADY DONE):

1. 🧾 FMR Dish Table (Vashette / Quotes / Summary / Theme / Verbatim Code)
2. 📈 Mode-Specific Table (e.g., Journey, Persona, Behavioral)
3. 🧠 Strategic Themes
4. 📝 Insight Summary

---

🔒 RULES (GUARDRAILS):

- DO NOT generate new quotes or themes
- ONLY reference exact insights from the completed analysis
- DO NOT speculate beyond the transcript or themes
- NEVER guess about the market or product
- Do not summarize transcripts again — only help interpret what's already extracted
- Use short, structured replies unless asked otherwise
- Max response = 200 words unless asked for detail
- Your tone must match the stakeholder type:
  - Strategic for Internal
  - Data-driven for Payers
  - Empathetic for Patients
  - Clinical-neutral for HCPs

---

🧠 AVAILABLE CONTENT:

📝 Summary: ${analysisData?.analysisSummary || 'No summary available'}

📊 Dish Table: ${analysisData?.dishTable || 'No FMR Dish data available'}

📈 Mode-Specific Table (${projectType}): ${analysisData?.modeTable || 'No mode analysis available'}

🎯 Strategic Themes: ${analysisData?.strategicThemes || 'No strategic themes available'}

---

💬 SAMPLE USER QUERIES YOU MAY RECEIVE:

- "Summarize top emotional blockers"
- "Show unmet needs from behavioral drivers"
- "List friction points in digital experience"
- "Create a 3-bullet summary for slides"
- "What makes HCPs hesitant?"
- "Draft persona from theme X"
- "Give me 1 quote per theme"

Only respond based on the inputs above. Do not go beyond scope.
`;
    };

    const systemPrompt = generateChatPrompt(project, analysis);

    // Build conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Ensure proper URL format - add slash if AZURE_ENDPOINT doesn't end with one
    const baseUrl = AZURE_ENDPOINT.endsWith('/') ? AZURE_ENDPOINT : `${AZURE_ENDPOINT}/`;
    const response = await fetch(`${baseUrl}openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`, {
      method: 'POST',
      headers: {
        'api-key': AZURE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        endpoint: `${baseUrl}openai/deployments/${DEPLOYMENT}/chat/completions`
      });
      throw new Error(`Azure OpenAI request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('No response from Azure OpenAI');
    }

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      usage: data.usage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in azure-openai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});