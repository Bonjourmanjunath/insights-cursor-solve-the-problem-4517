// Check if projects have documents
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lgxqviomumjiqljpnvuh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHF2aW9tdW1qaXFsanBudnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzE5NzQsImV4cCI6MjA1MDU0Nzk3NH0.ad99c337d6aa65d42e51ca9741b2980d3af408d06e651a988cb804474ccfeb83'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDocuments() {
  try {
    console.log('🔍 Checking projects and documents...')
    
    // Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('research_projects')
      .select('*')
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
      return
    }
    
    console.log(`📋 Found ${projects?.length || 0} projects`)
    
    if (!projects || projects.length === 0) {
      console.log('⚠️ No projects found - create a project first!')
      return
    }
    
    // Check each project for documents
    for (const project of projects) {
      console.log(`\n🔍 Checking project: ${project.name} (${project.id})`)
      
      const { data: documents, error: docsError } = await supabase
        .from('research_documents')
        .select('*')
        .eq('project_id', project.id)
      
      if (docsError) {
        console.error(`❌ Error fetching documents for ${project.name}:`, docsError)
        continue
      }
      
      console.log(`📄 Project "${project.name}" has ${documents?.length || 0} documents`)
      
      if (documents && documents.length > 0) {
        console.log('✅ This project has documents - Basic Analysis should work!')
        console.log('📝 Document IDs:', documents.map(d => d.id))
      } else {
        console.log('⚠️ No documents - upload transcripts first!')
      }
    }
    
  } catch (err) {
    console.error('💥 Check failed:', err)
  }
}

checkDocuments() 