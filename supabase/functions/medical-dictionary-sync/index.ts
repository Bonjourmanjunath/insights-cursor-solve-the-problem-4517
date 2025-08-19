import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MedicalTerm {
  id?: string;
  term: string;
  pronunciation?: string;
  category: 'drug' | 'condition' | 'procedure' | 'brand' | 'acronym' | 'anatomy';
  definition?: string;
  user_id?: string;
}

interface DictionaryRequest {
  action: 'create' | 'update' | 'delete' | 'list' | 'get' | 'bulk_import' | 'export';
  term?: MedicalTerm;
  term_id?: string;
  terms?: MedicalTerm[];
  category_filter?: string;
  search_query?: string;
}

// Enterprise-grade medical term validator
class MedicalTermValidator {
  private static readonly VALID_CATEGORIES = ['drug', 'condition', 'procedure', 'brand', 'acronym', 'anatomy'];
  private static readonly MAX_TERM_LENGTH = 200;
  private static readonly MAX_DEFINITION_LENGTH = 1000;

  static validateTerm(term: Partial<MedicalTerm>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!term.term || term.term.trim().length < 2) {
      errors.push("Term must be at least 2 characters");
    }

    if (term.term && term.term.length > this.MAX_TERM_LENGTH) {
      errors.push(`Term cannot exceed ${this.MAX_TERM_LENGTH} characters`);
    }

    if (!term.category || !this.VALID_CATEGORIES.includes(term.category)) {
      errors.push(`Category must be one of: ${this.VALID_CATEGORIES.join(', ')}`);
    }

    if (term.definition && term.definition.length > this.MAX_DEFINITION_LENGTH) {
      errors.push(`Definition cannot exceed ${this.MAX_DEFINITION_LENGTH} characters`);
    }

    if (term.pronunciation && term.pronunciation.length > 100) {
      errors.push("Pronunciation cannot exceed 100 characters");
    }

    // Validate medical term format
    if (term.term && !/^[a-zA-Z0-9\s\-\(\)\.]+$/.test(term.term)) {
      errors.push("Term contains invalid characters");
    }

    return { valid: errors.length === 0, errors };
  }

  static sanitizeTerm(term: MedicalTerm): MedicalTerm {
    return {
      ...term,
      term: term.term.trim(),
      pronunciation: term.pronunciation?.trim() || undefined,
      definition: term.definition?.trim() || undefined,
      category: term.category.toLowerCase() as MedicalTerm['category']
    };
  }
}

// Enterprise-grade medical dictionary service
class EnterpriseMedicalDictionary {
  private supabase: any;
  private userId: string;

  constructor(supabase: any, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  async createTerm(term: MedicalTerm): Promise<MedicalTerm> {
    const validation = MedicalTermValidator.validateTerm(term);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const sanitizedTerm = MedicalTermValidator.sanitizeTerm(term);

    // Check for duplicates
    const { data: existing } = await this.supabase
      .from('medical_dictionaries')
      .select('id')
      .eq('user_id', this.userId)
      .eq('term', sanitizedTerm.term)
      .eq('category', sanitizedTerm.category)
      .single();

    if (existing) {
      throw new Error(`Term "${sanitizedTerm.term}" already exists in category "${sanitizedTerm.category}"`);
    }

    const { data, error } = await this.supabase
      .from('medical_dictionaries')
      .insert({
        ...sanitizedTerm,
        user_id: this.userId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create term: ${error.message}`);
    }

    return data;
  }

  async listTerms(categoryFilter?: string, searchQuery?: string): Promise<MedicalTerm[]> {
    let query = this.supabase
      .from('medical_dictionaries')
      .select('*')
      .eq('user_id', this.userId)
      .order('term', { ascending: true });

    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }

    if (searchQuery) {
      query = query.ilike('term', `%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch terms: ${error.message}`);
    }

    return data || [];
  }

  async updateTerm(termId: string, updates: Partial<MedicalTerm>): Promise<MedicalTerm> {
    const validation = MedicalTermValidator.validateTerm(updates);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const sanitizedUpdates = MedicalTermValidator.sanitizeTerm(updates as MedicalTerm);

    const { data, error } = await this.supabase
      .from('medical_dictionaries')
      .update({
        ...sanitizedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', termId)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update term: ${error.message}`);
    }

    return data;
  }

  async deleteTerm(termId: string): Promise<void> {
    const { error } = await this.supabase
      .from('medical_dictionaries')
      .delete()
      .eq('id', termId)
      .eq('user_id', this.userId);

    if (error) {
      throw new Error(`Failed to delete term: ${error.message}`);
    }
  }

  async bulkImport(terms: MedicalTerm[]): Promise<{ created: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;

    for (const term of terms) {
      try {
        await this.createTerm(term);
        created++;
      } catch (error) {
        errors.push(`${term.term}: ${error.message}`);
      }
    }

    return { created, errors };
  }

  async exportTerms(): Promise<MedicalTerm[]> {
    return this.listTerms();
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
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    const dictionary = new EnterpriseMedicalDictionary(supabaseService, userId);

    const { 
      action, 
      term, 
      term_id, 
      terms, 
      category_filter, 
      search_query 
    }: DictionaryRequest = await req.json();

    switch (action) {
      case 'create': {
        if (!term) {
          return new Response(
            JSON.stringify({ success: false, error: "Term data required", code: "MISSING_DATA" }),
            { status: 400, headers: corsHeaders }
          );
        }

        const result = await dictionary.createTerm(term);
        
        return new Response(
          JSON.stringify({
            success: true,
            term: result,
            performance: { latency_ms: Date.now() - startTime }
          }),
          { status: 201, headers: corsHeaders }
        );
      }

      case 'list': {
        const result = await dictionary.listTerms(category_filter, search_query);
        
        return new Response(
          JSON.stringify({
            success: true,
            terms: result,
            count: result.length,
            performance: { latency_ms: Date.now() - startTime }
          }),
          { headers: corsHeaders }
        );
      }

      case 'update': {
        if (!term_id || !term) {
          return new Response(
            JSON.stringify({ success: false, error: "Term ID and data required", code: "MISSING_DATA" }),
            { status: 400, headers: corsHeaders }
          );
        }

        const result = await dictionary.updateTerm(term_id, term);
        
        return new Response(
          JSON.stringify({
            success: true,
            term: result,
            performance: { latency_ms: Date.now() - startTime }
          }),
          { headers: corsHeaders }
        );
      }

      case 'delete': {
        if (!term_id) {
          return new Response(
            JSON.stringify({ success: false, error: "Term ID required", code: "MISSING_ID" }),
            { status: 400, headers: corsHeaders }
          );
        }

        await dictionary.deleteTerm(term_id);
        
        return new Response(
          JSON.stringify({
            success: true,
            performance: { latency_ms: Date.now() - startTime }
          }),
          { headers: corsHeaders }
        );
      }

      case 'bulk_import': {
        if (!terms || !Array.isArray(terms)) {
          return new Response(
            JSON.stringify({ success: false, error: "Terms array required", code: "MISSING_DATA" }),
            { status: 400, headers: corsHeaders }
          );
        }

        const result = await dictionary.bulkImport(terms);
        
        return new Response(
          JSON.stringify({
            success: true,
            created: result.created,
            errors: result.errors,
            performance: { latency_ms: Date.now() - startTime }
          }),
          { headers: corsHeaders }
        );
      }

      case 'export': {
        const result = await dictionary.exportTerms();
        
        return new Response(
          JSON.stringify({
            success: true,
            terms: result,
            count: result.length,
            exported_at: new Date().toISOString(),
            performance: { latency_ms: Date.now() - startTime }
          }),
          { headers: corsHeaders }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid action", code: "INVALID_ACTION" }),
          { status: 400, headers: corsHeaders }
        );
    }

  } catch (error: any) {
    console.error("Medical Dictionary Sync Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
        code: "INTERNAL_ERROR",
        performance: { latency_ms: Date.now() - startTime }
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});