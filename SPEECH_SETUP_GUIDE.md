# 🎤 Speech Feature Setup Guide

## **Here's the Education Part:**

**What we're setting up:**
1. **Database Tables**: Creating speech-related tables in Supabase
2. **Environment Variables**: Configuring Azure Speech Services
3. **Security**: Setting up proper access controls

---

## **📋 STEP 1: Database Migration**

### **Option A: Using Supabase Dashboard (Recommended)**

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/lgxqviomumjiqljpnvuh
   - Navigate to **SQL Editor**

2. **Run the Migration Script**
   - Copy the contents of `setup_speech_tables.sql`
   - Paste it into the SQL Editor
   - Click **Run** to execute

3. **Verify Tables Created**
   - Go to **Table Editor**
   - You should see these new tables:
     - `speech_projects`
     - `speech_recordings`
     - `medical_dictionaries`
     - `speech_models`
     - `audit_logs`

### **Option B: Using Supabase CLI (If Docker is available)**

```bash
# Start local Supabase
supabase start

# Apply migration
supabase db push

# Stop local Supabase
supabase stop
```

---

## **🔑 STEP 2: Environment Variables Setup**

### **Azure Speech Services Configuration**

You need to set up Azure Speech Services in your Azure portal:

1. **Create Azure Speech Resource**
   - Go to Azure Portal: https://portal.azure.com
   - Create a new **Speech Service** resource
   - Note down:
     - **Resource Name**
     - **Region**
     - **API Key**

2. **Update Environment Variables**

Replace the placeholder values in Supabase with your actual Azure credentials:

```bash
# Set Azure Speech Services credentials
supabase secrets set AZURE_SPEECH_API_KEY="your_actual_azure_speech_api_key"
supabase secrets set AZURE_SPEECH_ENDPOINT="https://your-resource-name.cognitiveservices.azure.com/"
supabase secrets set AZURE_SPEECH_REGION="your_azure_region"

# Set Azure OpenAI credentials (for transcript formatting)
supabase secrets set AZURE_OPENAI_API_KEY="your_actual_azure_openai_api_key"
supabase secrets set AZURE_OPENAI_ENDPOINT="https://your-openai-resource.openai.azure.com/"
```

### **Example Values:**
```bash
# Example Azure Speech Services
AZURE_SPEECH_API_KEY="abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
AZURE_SPEECH_ENDPOINT="https://my-speech-resource.cognitiveservices.azure.com/"
AZURE_SPEECH_REGION="eastus"

# Example Azure OpenAI
AZURE_OPENAI_API_KEY="sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
AZURE_OPENAI_ENDPOINT="https://my-openai-resource.openai.azure.com/"
```

---

## **🔒 STEP 3: Security Verification**

### **Verify Row Level Security (RLS)**

After running the migration, verify that RLS is enabled:

1. **Check RLS Status**
   - Go to **Authentication > Policies**
   - Verify all speech tables have RLS enabled

2. **Test User Isolation**
   - Create a test project as one user
   - Try to access it as another user
   - Should be denied access

---

## **🚀 STEP 4: Testing the Speech Feature**

### **1. Create a Speech Project**
- Navigate to `/dashboard/speech`
- Click **New Project**
- Fill in project details
- Verify project is created

### **2. Upload Audio File**
- Go to your project
- Click **Upload New**
- Select an audio file (MP3, WAV, M4A, etc.)
- Configure processing options
- Start transcription

### **3. View Results**
- Check the **Recordings** tab
- View transcript and quality metrics
- Download transcript as text file

---

## **⚠️ IMPORTANT SECURITY NOTES**

### **Environment Variables Security**
- ✅ **Supabase Secrets**: Environment variables are stored securely in Supabase
- ✅ **No Local Files**: No `.env` files with sensitive data
- ✅ **Automatic Cleanup**: Credentials are not exposed in code

### **Access Control**
- ✅ **User Isolation**: Each user can only access their own data
- ✅ **RLS Policies**: Database-level security enforced
- ✅ **Audit Logging**: All operations are logged

---

## **🔧 Troubleshooting**

### **Common Issues:**

1. **"Azure Speech Services not configured"**
   - Check environment variables are set correctly
   - Verify Azure Speech resource is active

2. **"Project not found or access denied"**
   - Verify RLS policies are working
   - Check user authentication

3. **"File upload failed"**
   - Check file size (max 500MB)
   - Verify file format is supported

### **Debug Commands:**
```bash
# Check environment variables
supabase secrets list

# View function logs
supabase functions logs speech-transcriber

# Test function
curl -X POST https://lgxqviomumjiqljpnvuh.supabase.co/functions/v1/speech-project-manager \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "list"}'
```

---

## **✅ Completion Checklist**

- [ ] Database tables created successfully
- [ ] RLS policies enabled and working
- [ ] Azure Speech Services credentials configured
- [ ] Azure OpenAI credentials configured
- [ ] Storage bucket created for audio files
- [ ] Test project creation works
- [ ] Test audio upload works
- [ ] Test transcription works
- [ ] Test transcript download works

---

## **🎯 Next Steps**

Once setup is complete:

1. **Add Medical Terms**: Use the medical dictionary to enhance transcription accuracy
2. **Configure Processing Options**: Set up noise reduction and speaker diarization
3. **Integrate with Existing Workflow**: Connect speech transcripts to your analysis pipeline
4. **Monitor Usage**: Check audit logs for system usage

---

## **📞 Support**

If you encounter any issues:

1. Check the **Supabase Dashboard** for error logs
2. Verify **Azure Speech Services** is active and billing is set up
3. Test with a **small audio file** first
4. Check **browser console** for frontend errors

**Your Speech Feature is now ready to use! 🎉** 