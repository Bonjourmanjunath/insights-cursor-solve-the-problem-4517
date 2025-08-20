import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MedicalTerm {
  term: string
  category: 'drug' | 'condition' | 'procedure' | 'brand' | 'acronym' | 'anatomy'
  definition?: string
  pronunciation?: string
}

interface DictionaryRequest {
  action: 'create' | 'update' | 'delete' | 'list' | 'bulk_import' | 'export'
  term?: MedicalTerm
  terms?: MedicalTerm[]
  category_filter?: string
  search_query?: string
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

    const { action, term, terms, category_filter, search_query }: DictionaryRequest = await req.json()

    switch (action) {
      case 'create':
        if (!term) {
          throw new Error('Term data is required')
        }

        // Validate term
        if (!term.term || term.term.trim().length < 1) {
          throw new Error('Term is required')
        }

        if (!term.category || !['drug', 'condition', 'procedure', 'brand', 'acronym', 'anatomy'].includes(term.category)) {
          throw new Error('Valid category is required')
        }

        const { data: newTerm, error: createError } = await supabase
          .from('medical_dictionaries')
          .insert([{ ...term, user_id: user.id }])
          .select()
          .single()

        if (createError) throw createError

        return new Response(
          JSON.stringify({ success: true, term: newTerm }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'list':
        let query = supabase
          .from('medical_dictionaries')
          .select('*')
          .eq('user_id', user.id)

        if (category_filter) {
          query = query.eq('category', category_filter)
        }

        if (search_query) {
          query = query.ilike('term', `%${search_query}%`)
        }

        const { data: dictionaryTerms, error: listError } = await query
          .order('term', { ascending: true })

        if (listError) throw listError

        return new Response(
          JSON.stringify({ success: true, terms: dictionaryTerms }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'update':
        if (!term || !term.term) {
          throw new Error('Term data is required')
        }

        const { data: updatedTerm, error: updateError } = await supabase
          .from('medical_dictionaries')
          .update({
            category: term.category,
            definition: term.definition,
            pronunciation: term.pronunciation
          })
          .eq('term', term.term)
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) throw updateError

        return new Response(
          JSON.stringify({ success: true, term: updatedTerm }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'delete':
        if (!term || !term.term) {
          throw new Error('Term is required')
        }

        const { error: deleteError } = await supabase
          .from('medical_dictionaries')
          .delete()
          .eq('term', term.term)
          .eq('user_id', user.id)

        if (deleteError) throw deleteError

        return new Response(
          JSON.stringify({ success: true, message: 'Term deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'bulk_import':
        if (!terms || !Array.isArray(terms) || terms.length === 0) {
          throw new Error('Terms array is required')
        }

        // Validate all terms
        for (const t of terms) {
          if (!t.term || !t.category) {
            throw new Error('All terms must have term and category')
          }
        }

        const termsWithUserId = terms.map(t => ({ ...t, user_id: user.id }))

        const { data: importedTerms, error: importError } = await supabase
          .from('medical_dictionaries')
          .insert(termsWithUserId)
          .select()

        if (importError) throw importError

        return new Response(
          JSON.stringify({ 
            success: true, 
            imported_count: importedTerms.length,
            terms: importedTerms 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'export':
        const { data: exportTerms, error: exportError } = await supabase
          .from('medical_dictionaries')
          .select('*')
          .eq('user_id', user.id)
          .order('category', { ascending: true })

        if (exportError) throw exportError

        // Group by category
        const groupedTerms = exportTerms.reduce((acc, term) => {
          if (!acc[term.category]) {
            acc[term.category] = []
          }
          acc[term.category].push(term)
          return acc
        }, {})

        return new Response(
          JSON.stringify({ 
            success: true, 
            total_count: exportTerms.length,
            terms_by_category: groupedTerms,
            terms: exportTerms 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Medical Dictionary Sync Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 