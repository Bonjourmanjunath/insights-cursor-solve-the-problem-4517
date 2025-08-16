# FMR Dish Analysis API

A production-ready Azure Functions API that converts multiple interview transcripts and a discussion guide into an FMR Dish Analysis matrix.

## Overview

This API processes interview transcripts and a discussion guide to generate a structured FMR Dish Analysis matrix. The matrix organizes responses by discussion guide questions (rows) and respondents (columns), with each cell containing a verbatim quote, summary, and theme.

## Features

- **Guide Parsing**: Automatically parses discussion guides from various formats
- **Role-aware Filtering**: Removes moderator/interviewer content
- **Token-aware Chunking**: Processes large transcripts efficiently
- **Hybrid Retrieval**: Uses keywords and embeddings to find relevant content
- **Strict Extraction Schema**: Enforces controlled vocabulary for themes
- **Excel Export**: Generates polished Excel workbooks with proper formatting

## Setup

### Prerequisites

- Node.js 20.x
- Azure Functions Core Tools v4
- Azure OpenAI Service with chat and embedding deployments

### Environment Variables

Copy `local.settings.json.example` to `local.settings.json` and configure:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    
    "AOAI_CHAT_ENDPOINT": "https://<your-resource>.openai.azure.com/openai/deployments/<chat-deploy>/chat/completions?api-version=2023-07-01-preview",
    "AOAI_CHAT_API_KEY": "<your-chat-api-key>",
    
    "AOAI_EMBED_ENDPOINT": "https://<your-resource>.openai.azure.com/openai/deployments/<embed-deploy>/embeddings?api-version=2023-05-15",
    "AOAI_EMBED_API_KEY": "<your-embed-api-key>",
    
    "LOG_LEVEL": "info",
    "MAX_TOKENS_TOTAL": "500000"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

### Installation

```bash
npm install
```

### Local Development

```bash
npm start
# or
func start
```

## Deployment

### Deploy to Azure

```bash
func azure functionapp publish <your-function-app-name>
```

### Configure Azure Function App

In the Azure Portal, add these Application Settings:

- `AOAI_CHAT_ENDPOINT`
- `AOAI_CHAT_API_KEY`
- `AOAI_EMBED_ENDPOINT`
- `AOAI_EMBED_API_KEY`
- `LOG_LEVEL`
- `MAX_TOKENS_TOTAL`
- `NODE_OPTIONS=--max_old_space_size=3072`

Enable CORS for your frontend origin.

## API Usage

### Request Format

```json
{
  "files": [
    { "name": "IDI_EM_Hospital.txt", "label": "Emily", "content": "<full transcript text>" },
    { "name": "IDI_AM_Clinic.txt", "label": "Anita Morgan", "content": "<full transcript text>" }
  ],
  "guide": [
    { "theme": "Warm-up", "question": "Please introduce yourself and describe your background and patient population." },
    { "theme": "Current Practices", "question": "Walk me through your assessment and treatment process for your most common wound type." }
  ],
  "guideDescription": "Optional long description shown in UI"
}
```

Alternatively, `guide` can be a string containing the raw discussion guide text, which will be automatically parsed.

### Response Format

```json
{
  "fmr_dish": {
    "title": "FMR Dish Analysis",
    "description": "Matrix by guide questions and respondents",
    "questions": [
      {
        "question_type": "Warm-up",
        "question": "Please introduce yourself...",
        "respondents": {
          "Emily": {
            "quote": "...",
            "summary": "...",
            "theme": "Experience/Setting",
            "source": { "participantLabel": "Emily", "chunkId": "Emily_c07", "windowId": "w1" }
          },
          "Anita Morgan": { "..." }
        }
      }
    ]
  },
  "analysis_metadata": {
    "filesProcessed": 2,
    "guideItemsProcessed": 20,
    "supportedByQuoteRate": 0.75,
    "coverageRate": 0.85,
    "latency_ms": 12500,
    "totalTokens": 125000
  }
}
```

## Excel Output

The API generates a professionally formatted Excel workbook with:

- Title sheet with project info and metadata
- Main analysis sheet with the FMR Dish matrix
- Color-coded themes and sections
- Proper text wrapping and formatting

## Troubleshooting

### Common Issues

- **429 Rate Limit Errors**: Reduce concurrent requests or increase backoff parameters
- **Memory Issues**: Increase `NODE_OPTIONS=--max_old_space_size=4096` for larger transcripts
- **Guide Parsing Failures**: Check guide format or provide pre-parsed guide array

### Logs

Set `LOG_LEVEL` to `debug` for more detailed logs. In Azure, check Application Insights.

## License

Proprietary - FMR Global Health
