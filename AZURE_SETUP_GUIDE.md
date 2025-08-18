# Azure OpenAI Setup Guide 🚀

## Quick Fix for "Edge Function returned a non-2xx status code" Error

This error usually means your Azure OpenAI credentials aren't configured. Here's how to fix it in 2 minutes!

### Option 1: Use the Simple Guide Parser (Recommended for NOW!)

Just navigate to: `http://localhost:8082/dashboard/simple-guide-parser`

This works 100% locally without any API keys! 🎉

### Option 2: Set Up Azure OpenAI Credentials

1. **Get your Azure OpenAI credentials:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Find your OpenAI resource
   - Copy your endpoint and API key

2. **Set environment variables in Supabase:**
   ```bash
   # In your terminal, run:
   supabase secrets set FMR_AZURE_OPENAI_API_KEY=your-api-key-here
   supabase secrets set FMR_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   supabase secrets set FMR_AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
   ```

3. **Restart your edge functions:**
   ```bash
   supabase functions serve --env-file ./supabase/.env.local
   ```

### Option 3: Use a Fallback Parser (Quick Development Fix)

If you don't have Azure credentials yet, you can modify the edge function to use a simple parser:

```typescript
// In guide-aware-worker/index.ts, replace the Azure call with:
if (!azureApiKey || !azureEndpoint) {
  // Fallback to simple parsing
  const sections = guideText.split('\n\n').map((section, index) => ({
    id: `section_${index + 1}`,
    title: section.split('\n')[0],
    questions: section.split('\n').slice(1).filter(line => line.includes('?'))
  }));
  
  return new Response(JSON.stringify({ 
    success: true, 
    sections 
  }), { headers: corsHeaders });
}
```

## Why This Happens 🤓

**Here's the education part:** Edge functions are like little cloud workers that run your code. When they can't find their tools (API keys), they throw errors. It's like a chef trying to cook without ingredients - they'll just send you an angry note (HTTP error) instead of food!

## Pro Tips 💡

1. **Always use local solutions first** during development
2. **Test with small guides** before processing large documents
3. **Keep your API keys secret** - never commit them to Git!

## Still Having Issues?

Try these in order:
1. Use the Simple Guide Parser at `/dashboard/simple-guide-parser`
2. Check the browser console for detailed errors
3. Look at Supabase logs: `supabase functions logs guide-aware-worker`
4. Verify your Azure deployment supports the model you're using

Remember: The simple parser works WITHOUT any setup! Use it to keep moving forward! 🚀