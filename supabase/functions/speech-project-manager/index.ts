import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SpeechProject {
  id?: string;
  name: string;
  description?: string;
  language: string;
  user_id: string;
}

interface ProjectRequest {
  action: 'create' | 'update' | 'delete' | 'list' | 'get';
  project?: SpeechProject;
  project_id?: string;
}

// Enterprise-grade validation
class ProjectValidator {
  static validateProject(project: Partial<SpeechProject>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!project.name || project.name.trim().length < 2) {
      errors.push("Project name must be at least 2 characters");
    }

    if (project.name && project.name.length > 100) {
      errors.push("Project name cannot exceed 100 characters");
    }

    if (project.description && project.description.length > 500) {
      errors.push("Description cannot exceed 500 characters");
    }

    if (!project.language || !/^[a-z]{2}-[A-Z]{2}$/.test(project.language)) {
      errors.push("Language must be in format 'en-US'");
    }

    return { valid: errors.length === 0, errors };
  }
}

// Enterprise-grade rate limiter
class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  private static readonly RATE_LIMIT = 100; // requests per hour
  private static readonly WINDOW_MS = 60 * 60 * 1000; // 1 hour

  static checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const userRequests = this.requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      // Reset or initialize
      this.requests.set(userId, { count: 1, resetTime: now + this.WINDOW_MS });
      return { allowed: true, remaining: this.RATE_LIMIT - 1, resetTime: now + this.WINDOW_MS };
    }

    if (userRequests.count >= this.RATE_LIMIT) {
      return { allowed: false, remaining: 0, resetTime: userRequests.resetTime };
    }

    userRequests.count++;
    return { 
      allowed: true, 
      remaining: this.RATE_LIMIT - userRequests.count, 
      resetTime: userRequests.resetTime 
    };
  }
}

// Enterprise-grade audit logger
class AuditLogger {
  static async log(
    supabase: any,
    userId: string,
    action: string,
    resourceId: string,
    metadata: any = {}
  ) {
    try {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action,
        resource_type: 'speech_project',
        resource_id: resourceId,
        metadata,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Audit logging failed:', error);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | undefined;

  try {
    // Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required", code: "AUTH_REQUIRED" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token", code: "AUTH_INVALID" }),
        { status: 401, headers: corsHeaders }
      );
    }

    userId = user.id;

    // Rate limiting
    const rateLimit = RateLimiter.checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Rate limit exceeded", 
          code: "RATE_LIMITED",
          resetTime: rateLimit.resetTime
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders,
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString()
          }
        }
      );
    }

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    const { action, project, project_id }: ProjectRequest = await req.json();

    // Enterprise-grade request validation
    if (!action || !['create', 'update', 'delete', 'list', 'get'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action", code: "INVALID_ACTION" }),
        { status: 400, headers: corsHeaders }
      );
    }

    switch (action) {
      case 'create': {
        if (!project) {
          return new Response(
            JSON.stringify({ success: false, error: "Project data required", code: "MISSING_DATA" }),
            { status: 400, headers: corsHeaders }
          );
        }

        const validation = ProjectValidator.validateProject(project);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Validation failed", 
              code: "VALIDATION_ERROR",
              details: validation.errors 
            }),
            { status: 400, headers: corsHeaders }
          );
        }

        const { data, error } = await supabaseService
          .from('speech_projects')
          .insert({
            ...project,
            user_id: userId,
            recording_count: 0
          })
          .select()
          .single();

        if (error) {
          await AuditLogger.log(supabaseService, userId, 'create_project_failed', 'unknown', { error: error.message });
          throw new Error(`Failed to create project: ${error.message}`);
        }

        await AuditLogger.log(supabaseService, userId, 'create_project', data.id, { name: project.name });

        return new Response(
          JSON.stringify({ 
            success: true, 
            project: data,
            performance: { latency_ms: Date.now() - startTime }
          }),
          { status: 201, headers: corsHeaders }
        );
      }

      case 'list': {
        const { data, error } = await supabaseService
          .from('speech_projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch projects: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            projects: data || [],
            count: data?.length || 0,
            performance: { latency_ms: Date.now() - startTime }
          }),
          { headers: corsHeaders }
        );
      }

      case 'get': {
        if (!project_id) {
          return new Response(
            JSON.stringify({ success: false, error: "Project ID required", code: "MISSING_ID" }),
            { status: 400, headers: corsHeaders }
          );
        }

        const { data, error } = await supabaseService
          .from('speech_projects')
          .select('*')
          .eq('id', project_id)
          .eq('user_id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return new Response(
              JSON.stringify({ success: false, error: "Project not found", code: "NOT_FOUND" }),
              { status: 404, headers: corsHeaders }
            );
          }
          throw error;
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            project: data,
            performance: { latency_ms: Date.now() - startTime }
          }),
          { headers: corsHeaders }
        );
      }

      case 'update': {
        if (!project_id || !project) {
          return new Response(
            JSON.stringify({ success: false, error: "Project ID and data required", code: "MISSING_DATA" }),
            { status: 400, headers: corsHeaders }
          );
        }

        const validation = ProjectValidator.validateProject(project);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Validation failed", 
              code: "VALIDATION_ERROR",
              details: validation.errors 
            }),
            { status: 400, headers: corsHeaders }
          );
        }

        const { data, error } = await supabaseService
          .from('speech_projects')
          .update({
            ...project,
            updated_at: new Date().toISOString()
          })
          .eq('id', project_id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          await AuditLogger.log(supabaseService, userId, 'update_project_failed', project_id, { error: error.message });
          throw new Error(`Failed to update project: ${error.message}`);
        }

        await AuditLogger.log(supabaseService, userId, 'update_project', project_id, { changes: project });

        return new Response(
          JSON.stringify({ 
            success: true, 
            project: data,
            performance: { latency_ms: Date.now() - startTime }
          }),
          { headers: corsHeaders }
        );
      }

      case 'delete': {
        if (!project_id) {
          return new Response(
            JSON.stringify({ success: false, error: "Project ID required", code: "MISSING_ID" }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Check if project has recordings
        const { data: recordings } = await supabaseService
          .from('speech_recordings')
          .select('id')
          .eq('project_id', project_id)
          .limit(1);

        if (recordings && recordings.length > 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Cannot delete project with recordings", 
              code: "HAS_RECORDINGS" 
            }),
            { status: 409, headers: corsHeaders }
          );
        }

        const { error } = await supabaseService
          .from('speech_projects')
          .delete()
          .eq('id', project_id)
          .eq('user_id', userId);

        if (error) {
          await AuditLogger.log(supabaseService, userId, 'delete_project_failed', project_id, { error: error.message });
          throw new Error(`Failed to delete project: ${error.message}`);
        }

        await AuditLogger.log(supabaseService, userId, 'delete_project', project_id);

        return new Response(
          JSON.stringify({ 
            success: true,
            performance: { latency_ms: Date.now() - startTime }
          }),
          { headers: corsHeaders }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Unknown action", code: "UNKNOWN_ACTION" }),
          { status: 400, headers: corsHeaders }
        );
    }

  } catch (error: any) {
    console.error("Speech Project Manager Error:", error);
    
    if (userId) {
      await AuditLogger.log(
        createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!),
        userId,
        'error',
        'unknown',
        { error: error.message, stack: error.stack }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
        code: "INTERNAL_ERROR",
        performance: { latency_ms: Date.now() - startTime }
      }),
      { 
        status: 500, 
        headers: {
          ...corsHeaders,
          'X-RateLimit-Remaining': RateLimiter.checkRateLimit(userId || 'unknown').remaining.toString()
        }
      }
    );
  }
});