# ChatGPT Team Integration Setup Guide

## 🚀 Overview

This guide will help you integrate your ChatGPT Team custom GPTs with the FMR Insights Navigator for enhanced internal team collaboration.

## 📋 Prerequisites

1. **ChatGPT Team Account** - Active ChatGPT Team subscription
2. **OpenAI API Key** - From your ChatGPT Team account
3. **Custom GPTs** - Your team's specialized GPTs

## 🔧 Setup Steps

### Step 1: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in with your ChatGPT Team account
3. Navigate to **API Keys** section
4. Create a new API key or copy existing one
5. Note your **Organization ID** (if applicable)

### Step 2: Configure Environment Variables

Add these to your `.env` file:

```env
# ChatGPT Team Configuration
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_ORG_ID=your_organization_id_here  # Optional
```

### Step 3: Configure Your Custom GPTs

Edit `src/lib/chatgpt-team-config.ts` to add your team's custom GPTs:

```typescript
CUSTOM_GPTs: [
  {
    id: 'your-custom-gpt-id',
    name: 'Your Custom GPT Name',
    description: 'Description of what this GPT does',
    instructions: `Your custom GPT instructions here...`,
    useCase: 'analysis', // or 'transcription', 'chat', 'export', 'general'
    isActive: true
  },
  // Add more custom GPTs...
]
```

### Step 4: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to a project's analysis page
3. Go to the **Chat** tab
4. Scroll down to see the **ChatGPT Team Integration** section
5. Click the **Test Connection** button
6. If successful, you'll see a green "Connected" badge

## 🎯 Use Cases

### Analysis GPTs
- **Purpose**: Specialized analysis of healthcare research data
- **Best for**: FMR Dish analysis, strategic insights, pattern recognition
- **Example**: "Analyze the patient journey patterns in this transcript"

### Transcription GPTs
- **Purpose**: Enhanced transcription and language processing
- **Best for**: Medical terminology, multi-language support, quality assurance
- **Example**: "Improve the medical terminology in this transcript"

### Chat GPTs
- **Purpose**: Interactive research assistance
- **Best for**: Q&A, methodology guidance, strategic recommendations
- **Example**: "What are the key insights from this analysis?"

### Export GPTs
- **Purpose**: Report and document generation
- **Best for**: Executive summaries, presentations, detailed reports
- **Example**: "Create an executive summary of these findings"

## 🔒 Security Considerations

1. **API Key Security**: Never commit API keys to version control
2. **Rate Limiting**: The system includes built-in rate limiting
3. **Access Control**: Only team members with access can use the integration
4. **Data Privacy**: All requests go through your team's OpenAI account

## 🛠️ Troubleshooting

### Connection Issues
- Verify your API key is correct
- Check your ChatGPT Team subscription status
- Ensure your organization ID is correct (if using)

### Rate Limiting
- The system automatically handles rate limits
- Wait a few seconds between requests
- Check your OpenAI usage dashboard

### Custom GPT Not Found
- Verify the GPT ID in the configuration
- Ensure the GPT is active (`isActive: true`)
- Check that the use case matches your needs

## 📊 Monitoring

### Usage Tracking
- Monitor API usage in your OpenAI dashboard
- Track token consumption per request
- Review request logs for optimization

### Performance
- Response times typically 2-5 seconds
- Automatic retry on failures (3 attempts)
- Exponential backoff for rate limits

## 🚀 Advanced Configuration

### Custom Model Selection
Edit the `makeOpenAIRequest` method in `chatgpt-team-service.ts`:

```typescript
body: JSON.stringify({
  model: 'gpt-4-turbo', // or your custom model
  // ... other options
})
```

### Custom Instructions
Modify the system message in the service:

```typescript
messages: [
  {
    role: 'system',
    content: 'Your custom system instructions here...'
  },
  // ... user message
]
```

### Batch Processing
Use the batch processing feature for multiple requests:

```typescript
const requests = [
  { gptId: 'gpt1', message: 'Question 1' },
  { gptId: 'gpt2', message: 'Question 2' }
];

const results = await chatGPTTeamService.batchProcess(requests);
```

## 🎉 Success!

Once configured, your team can:

✅ Use custom GPTs directly within the FMR Insights Navigator
✅ Access specialized healthcare research analysis
✅ Export responses in various formats
✅ Collaborate seamlessly with team-specific AI assistants
✅ Maintain security and access control

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review OpenAI API documentation
3. Contact your ChatGPT Team administrator
4. Check the application logs for detailed error messages

---

**Happy collaborating with your custom GPTs! 🚀** 