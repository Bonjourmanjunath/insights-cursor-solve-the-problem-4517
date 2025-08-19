import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    // Create client with anon key for JWT validation
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Invalid authentication token");
    }

    // Create service role client for database operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const { method, body } = await req.json();

    // Validate that the user_id in the request matches the authenticated user
    if (body.user_id && body.user_id !== user.id) {
      throw new Error("User ID mismatch");
    }

    switch (method) {
      case "CREATE_PROJECT": {
        const {
          name,
          description,
          research_goal,
          project_type,
          stakeholder_type,
          country,
          therapy_area,
          language,
          guide_context,
          priority,
          deadline,
          owner,
          transcript_format,
          rfp_summary,
        } = body;
        const { data, error } = await supabaseService
          .from("research_projects")
          .insert({
            name,
            description,
            research_goal,
            project_type,
            stakeholder_type,
            country,
            therapy_area,
            language,
            guide_context,
            priority,
            deadline,
            owner,
            transcript_format,
            rfp_summary,
            user_id: user.id,
            document_count: 0,
            code_count: 0,
            quotation_count: 0,
          })
          .select()
          .single();
        if (error) {
          throw new Error(`Failed to create project: ${error.message}`);
        }
        return new Response(
          JSON.stringify({
            success: true,
            project: data,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
      case "GET_PROJECTS": {
        const { user_id } = body;
        const { data, error } = await supabaseService
          .from("research_projects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });
        if (error) {
          throw new Error(`Failed to fetch projects: ${error.message}`);
        }
        return new Response(
          JSON.stringify({
            success: true,
            projects: data,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
      case "UPDATE_PROJECT": {
        const { project_id, user_id, updates } = body;
        const { data, error } = await supabaseService
          .from("research_projects")
          .update(updates)
          .eq("id", project_id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) {
          throw new Error(`Failed to update project: ${error.message}`);
        }
        return new Response(
          JSON.stringify({
            success: true,
            project: data,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
      case "DELETE_PROJECT": {
        const { project_id, user_id } = body;
        const { error } = await supabaseService
          .from("research_projects")
          .delete()
          .eq("id", project_id)
          .eq("user_id", user.id);
        if (error) {
          throw new Error(`Failed to delete project: ${error.message}`);
        }
        return new Response(
          JSON.stringify({
            success: true,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error) {
    console.error("Error in project-management function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
