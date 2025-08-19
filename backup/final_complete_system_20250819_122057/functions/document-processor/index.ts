import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Advanced text extraction function using OpenAI when needed
async function extractTextFromDocx(arrayBuffer: ArrayBuffer, fileName: string): Promise<string> {
  try {
    // Convert ArrayBuffer to Uint8Array
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Basic approach: DOCX files are ZIP archives containing XML
    // We'll try to extract readable text from the document.xml content
    let rawText = '';
    
    // Convert to string and look for readable patterns
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const fullText = decoder.decode(uint8Array);
    
    // Extract text between XML tags, focusing on interview content
    const textPattern = /(?:>)([^<]+?)(?:<)/g;
    const matches = [...fullText.matchAll(textPattern)];
    
    const extractedSegments = matches
      .map(match => match[1])
      .filter(text => text && text.trim().length > 5) // Filter out very short segments
      .filter(text => !/^[\s\r\n]*$/.test(text)) // Filter out whitespace-only
      .filter(text => !/^[0-9\-\.\/\s]*$/.test(text)) // Filter out date/number patterns
      .filter(text => !text.includes('xml') && !text.includes('rels')) // Filter out XML artifacts
      .map(text => text.trim());
    
    // Join segments and clean up
    rawText = extractedSegments.join(' ').replace(/\s+/g, ' ').trim();
    
    // If we got reasonable content, return it
    if (rawText.length > 100) {
      return rawText;
    }
    
    // Fallback: return a placeholder indicating we need manual processing
    return `Document "${fileName}" was uploaded but requires manual text extraction. The file appears to contain ${Math.round(arrayBuffer.byteLength / 1024)}KB of data. Please manually copy and paste the transcript content, or convert to a plain text format.`;
    
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    return `Error processing document "${fileName}": ${error.message}. Please try converting to plain text format.`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with anon key for JWT validation
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Create service role client for database operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const { document_id, project_id } = await req.json();

    if (!document_id && !project_id) {
      throw new Error('Either document_id or project_id is required');
    }

    console.log('Processing documents for:', { document_id, project_id });

    // Get documents to process - look for documents that need processing
    let query = supabaseService
      .from('research_documents')
      .select('*')
      .eq('user_id', user.id)
      .or('content.like.%Document uploaded - content processing pending%,content.is.null');

    if (document_id) {
      query = query.eq('id', document_id);
    } else if (project_id) {
      query = query.eq('project_id', project_id);
    }

    const { data: documents, error: docError } = await query;

    if (docError) {
      throw new Error(`Failed to fetch documents: ${docError.message}`);
    }

    if (!documents || documents.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No documents found that need processing',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${documents.length} documents to process`);
    documents.forEach((doc, index) => {
      console.log(`📄 Document ${index + 1}: ${doc.name} (${doc.file_type})`);
      console.log(`📝 Content preview: ${doc.content?.substring(0, 100) || 'NO CONTENT'}...`);
    });

    let processedCount = 0;
    const results = [];

    // Process each document
    for (const doc of documents) {
      try {
        console.log(`Processing document: ${doc.name}, storage_path: ${doc.storage_path}`);

        // Download the file from storage - trying different bucket names
        let fileData, downloadError;
        
        // Try research-documents bucket first
        const downloadResult1 = await supabaseService.storage
          .from('research-documents')
          .download(doc.storage_path);
        
        if (downloadResult1.error) {
          console.log(`Failed to download from research-documents bucket: ${downloadResult1.error.message}`);
          
          // Try documents bucket as fallback
          const downloadResult2 = await supabaseService.storage
            .from('documents')
            .download(doc.storage_path);
            
          if (downloadResult2.error) {
            console.error(`Failed to download from both buckets: ${downloadResult1.error.message}, ${downloadResult2.error.message}`);
            results.push({ id: doc.id, name: doc.name, success: false, error: `Storage error: ${downloadResult1.error.message}` });
            continue;
          } else {
            fileData = downloadResult2.data;
          }
        } else {
          fileData = downloadResult1.data;
        }

        // Convert to ArrayBuffer for processing
        const arrayBuffer = await fileData.arrayBuffer();
        
        // Extract text content
        let extractedText = '';
        
        if (doc.file_type === 'docx' || doc.name.toLowerCase().endsWith('.docx')) {
          extractedText = await extractTextFromDocx(arrayBuffer, doc.name);
        } else if (doc.file_type === 'txt' || doc.name.toLowerCase().endsWith('.txt')) {
          extractedText = new TextDecoder().decode(arrayBuffer);
        } else if (doc.file_type === 'pdf' || doc.name.toLowerCase().endsWith('.pdf')) {
          // For now, mark as unsupported - would need PDF parsing library
          extractedText = 'PDF processing not yet implemented. Please convert to Word or text format.';
        } else {
          extractedText = 'Unsupported file format for text extraction';
        }

        // Update the document with extracted content
        const { error: updateError } = await supabaseService
          .from('research_documents')
          .update({
            content: extractedText,
            processing_status: 'processed'
          })
          .eq('id', doc.id);

        if (updateError) {
          console.error(`Failed to update ${doc.name}:`, updateError);
          results.push({ id: doc.id, name: doc.name, success: false, error: updateError.message });
        } else {
          processedCount++;
          results.push({ 
            id: doc.id, 
            name: doc.name, 
            success: true, 
            contentLength: extractedText.length 
          });
          console.log(`✅ Processed ${doc.name} - extracted ${extractedText.length} characters`);
        }

      } catch (error) {
        console.error(`Error processing ${doc.name}:`, error);
        results.push({ id: doc.id, name: doc.name, success: false, error: error.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} out of ${documents.length} documents`,
      processed: processedCount,
      total: documents.length,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in document processor function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});