import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SpeechProject {
  name: string
  description?: string
  language: string
  user_id: string
}

interface ProjectValidator {
  validateProject(project: SpeechProject): { isValid: boolean; errors: string[] }
  validateRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }>
}

class ProjectValidatorImpl implements ProjectValidator {
  validateProject(project: SpeechProject): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!project.name || project.name.trim().length < 1) {
      errors.push('Project name is required')
    }
    
    if (project.name && project.name.length > 100) {
      errors.push('Project name must be less than 100 characters')
    }
    
    if (!project.language || !this.isValidLanguage(project.language)) {
      errors.push('Valid language is required (e.g., en-US, es-ES, fr-FR)')
    }
    
    if (project.description && project.description.length > 500) {
      errors.push('Description must be less than 500 characters')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  async validateRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    // Rate limiting: 100 requests/hour per user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const { count } = await supabase
      .from('speech_projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo.toISOString())
    
    const remaining = Math.max(0, 100 - (count || 0))
    return {
      allowed: remaining > 0,
      remaining
    }
  }
  
  private isValidLanguage(language: string): boolean {
    const validLanguages = [
      'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 
      'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN', 'ru-RU', 'ar-SA'
    ]
    return validLanguages.includes(language)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid user')
    }

    const { action, project, project_id } = await req.json()
    const validator = new ProjectValidatorImpl()

    // Rate limiting
    const rateLimit = await validator.validateRateLimit(user.id)
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          remaining: rateLimit.remaining,
          resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    switch (action) {
      case 'create':
        if (!project) {
          throw new Error('Project data is required')
        }

        const validation = validator.validateProject(project)
        if (!validation.isValid) {
          return new Response(
            JSON.stringify({ error: 'Validation failed', details: validation.errors }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: newProject, error: createError } = await supabase
          .from('speech_projects')
          .insert([{ ...project, user_id: user.id }])
          .select()
          .single()

        if (createError) throw createError

        // Audit logging
        await supabase
          .from('audit_logs')
          .insert([{
            user_id: user.id,
            action: 'speech_project_created',
            resource_type: 'speech_project',
            resource_id: newProject.id,
            details: { project_name: project.name }
          }])

        return new Response(
          JSON.stringify({ success: true, project: newProject }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'list':
        const { data: projects, error: listError } = await supabase
          .from('speech_projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (listError) throw listError

        return new Response(
          JSON.stringify({ success: true, projects }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'get':
        if (!project_id) {
          throw new Error('Project ID is required')
        }

        const { data: projectData, error: getError } = await supabase
          .from('speech_projects')
          .select('*')
          .eq('id', project_id)
          .eq('user_id', user.id)
          .single()

        if (getError) throw getError

        return new Response(
          JSON.stringify({ success: true, project: projectData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'update':
        if (!project_id || !project) {
          throw new Error('Project ID and data are required')
        }

        const updateValidation = validator.validateProject(project)
        if (!updateValidation.isValid) {
          return new Response(
            JSON.stringify({ error: 'Validation failed', details: updateValidation.errors }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: updatedProject, error: updateError } = await supabase
          .from('speech_projects')
          .update({ ...project, updated_at: new Date().toISOString() })
          .eq('id', project_id)
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) throw updateError

        // Audit logging
        await supabase
          .from('audit_logs')
          .insert([{
            user_id: user.id,
            action: 'speech_project_updated',
            resource_type: 'speech_project',
            resource_id: project_id,
            details: { project_name: project.name }
          }])

        return new Response(
          JSON.stringify({ success: true, project: updatedProject }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'delete':
        if (!project_id) {
          throw new Error('Project ID is required')
        }

        const { error: deleteError } = await supabase
          .from('speech_projects')
          .delete()
          .eq('id', project_id)
          .eq('user_id', user.id)

        if (deleteError) throw deleteError

        // Audit logging
        await supabase
          .from('audit_logs')
          .insert([{
            user_id: user.id,
            action: 'speech_project_deleted',
            resource_type: 'speech_project',
            resource_id: project_id
          }])

        return new Response(
          JSON.stringify({ success: true, message: 'Project deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Speech Project Manager Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 