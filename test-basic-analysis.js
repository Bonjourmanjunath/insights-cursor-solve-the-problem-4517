// Test script for basic-analysis function
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lgxqviomumjiqljpnvuh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHF2aW9tdW1qaXFsanBudnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzE5NzQsImV4cCI6MjA1MDU0Nzk3NH0.ad99c337d6aa65d42e51ca9741b2980d3af408d06e651a988cb804474ccfeb83'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBasicAnalysis() {
  try {
    console.log('🔍 Testing basic-analysis function...')
    
    // First, let's check if we have any projects
    const { data: projects, error: projectsError } = await supabase
      .from('research_projects')
      .select('*')
      .limit(1)
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
      return
    }
    
    if (!projects || projects.length === 0) {
      console.log('⚠️ No projects found')
      return
    }
    
    const project = projects[0]
    console.log('📋 Found project:', project.name, 'ID:', project.id)
    
    // Check if project has documents
    const { data: documents, error: docsError } = await supabase
      .from('research_documents')
      .select('*')
      .eq('project_id', project.id)
    
    if (docsError) {
      console.error('❌ Error fetching documents:', docsError)
      return
    }
    
    console.log('📄 Found', documents?.length || 0, 'documents')
    
    if (!documents || documents.length === 0) {
      console.log('⚠️ No documents found - this might be the cause of the 500 error')
      return
    }
    
    // Now test the function
    console.log('🚀 Calling basic-analysis function...')
    const { data, error } = await supabase.functions.invoke('basic-analysis', {
      body: {
        project_id: project.id
      }
    })
    
    if (error) {
      console.error('❌ Function error:', error)
      return
    }
    
    console.log('✅ Function success:', data)
    
  } catch (err) {
    console.error('💥 Test failed:', err)
  }
}

testBasicAnalysis() 