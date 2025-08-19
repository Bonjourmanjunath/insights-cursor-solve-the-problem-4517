// supabase/functions/content-analysis-queue/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  // 1) Preflight - handle this first and return immediately
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: buildCorsHeaders(req) 
    });
  }

  try {
    if (req.method !== "POST")
      return json(req, { error: "METHOD_NOT_ALLOWED" }, { status: 405 });

    const steps: string[] = [];
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    steps.push("parse-body");
    const raw = await req.text();
    let body: any;
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      return json(req, { ok: false, code: "INVALID_JSON", steps }, { status: 400 });
    }

    const project_id: string = body?.project_id;
    if (!project_id || !/^[0-9a-f-]{36}$/i.test(project_id)) {
      return json(req, { ok: false, code: "INVALID_PROJECT_ID", steps, project_id }, { status: 400 });
    }

    steps.push("env-check");
    if (!supabaseUrl || !serviceKey) {
      return json(
        req,
        {
          ok: false,
          code: "MISSING_ENV",
          missing: {
            SUPABASE_URL: !supabaseUrl,
            SUPABASE_SERVICE_ROLE_KEY: !serviceKey,
          },
          steps,
        },
        { status: 500 },
      );
    }

    steps.push("sb-admin");
    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
      global: { headers: { "X-Client-Info": "content-analysis-queue@v3" } },
    });

    // 1) Project (expects research_projects table with guide_context)
    steps.push("select-project");
    const { data: proj, error: pErr } = await sb
      .from("research_projects")
      .select("id, guide_context")
      .eq("id", project_id)
      .single();

    if (pErr) {
      return json(
        req,
        { ok: false, code: "PROJECT_SELECT_ERROR", detail: pErr, steps, project_id },
        { status: 500 },
      );
    }
    if (!proj) return json(req, { ok: false, code: "PROJECT_NOT_FOUND", steps, project_id }, { status: 404 });

    // guide_context can be JSON or null
    const guide = proj.guide_context ?? null;
    if (!guide) {
      return json(req, { ok: false, code: "NO_GUIDE_FOR_PROJECT", steps, project_id }, { status: 409 });
    }

    // 2) Docs (expects research_documents table)
    steps.push("select-docs");
    const { data: docs, error: dErr } = await sb
      .from("research_documents")
      .select("id, name, content, storage_path")
      .eq("project_id", project_id);

    if (dErr) {
      return json(req, { ok: false, code: "DOCS_SELECT_ERROR", detail: dErr, steps }, { status: 500 });
    }
    const docCount = docs?.length ?? 0;
    if (!docCount) {
      return json(req, { ok: false, code: "NO_DOCUMENTS_FOR_PROJECT", steps, project_id }, { status: 422 });
    }

    // 3) Extract questions from guide (supports sections + subsections)
    steps.push("flatten-questions");
    const flatten = (g: any) => {
      const out: { section_title: string; id?: string; text: string }[] = [];
      const sections = g?.sections ?? [];
      for (const s of sections) {
        const sectionTitle = s?.title ?? s?.name ?? "Section";
        const directQs = Array.isArray(s?.questions) ? s.questions : [];
        for (const q of directQs) {
          const text = q?.text ?? q?.question ?? "";
          if (text?.trim()) out.push({ section_title: sectionTitle, id: q?.id, text });
        }
        const subs = Array.isArray(s?.subsections) ? s.subsections : [];
        for (const sub of subs) {
          const subTitle = sub?.title ?? sub?.name ?? sectionTitle;
          const subQs = Array.isArray(sub?.questions) ? sub.questions : [];
          for (const q of subQs) {
            const text = q?.text ?? q?.question ?? "";
            if (text?.trim()) out.push({ section_title: subTitle, id: q?.id, text });
          }
        }
      }
      return out;
    };
    const questions = flatten(guide);
    const qCount = questions.length;

    if (!qCount) {
      return json(req, { ok: false, code: "NO_QUESTIONS_IN_GUIDE", steps, project_id }, { status: 422 });
    }

    // 4) Build units in-memory (doc × question)
    steps.push("build-units");
    const units = [];
    for (const d of docs) {
      for (const q of questions) {
        units.push({
          project_id,
          document_id: d.id,
          document_name: d.name ?? null,
          section_title: q.section_title,
          question_id: q.id ?? null,
          question_text: q.text,
          status: "queued",
        });
      }
    }
    if (!units.length) {
      return json(req, { ok: false, code: "NO_UNITS_BUILT", steps }, { status: 422 });
    }

    // 5) Insert job (expects content_analysis_jobs table with metadata jsonb & status)
    steps.push("insert-job");
    const jobRow = {
      project_id,
      status: "queued",
      metadata: {
        docCount,
        qCount,
        unitCount: units.length,
        // keep preview only, not the full units, to avoid large row sizes
        unitsPreview: units.slice(0, 5),
      },
    };

    const { data: ins, error: iErr } = await sb
      .from("content_analysis_jobs")
      .insert(jobRow)
      .select("id")
      .single();

    if (iErr) {
      return json(req, { ok: false, code: "JOB_INSERT_ERROR", detail: iErr, steps, jobRow }, { status: 500 });
    }

    // 6) Store units somewhere the worker expects.
    // If you do not have a units table, write them to a staging table or
    // a separate `content_analysis_job_units` table. For now we attach to a table
    // named content_analysis_job_units if it exists; otherwise we skip and report.
    steps.push("insert-units");
    const { error: iuErr } = await sb
      .from("content_analysis_job_units")
      .insert(
        units.map((u) => ({ ...u, job_id: ins.id })),
      );

    if (iuErr) {
      // Don't crash. Tell you exactly what failed.
      return json(
        req,
        {
          ok: false,
          code: "UNITS_INSERT_ERROR",
          detail: iuErr,
          steps,
          hint:
            "Create table public.content_analysis_job_units with columns (job_id uuid, project_id uuid, document_id uuid, document_name text, section_title text, question_id text, question_text text, status text). Or change the insert to match your schema.",
        },
        { status: 500 },
      );
    }

    steps.push("done");
    return json(req, {
      ok: true,
      job_id: ins.id,
      docCount,
      qCount,
      unitCount: units.length,
      steps,
    });
  } catch (err: any) {
    console.error("QUEUE_UNEXPECTED", err);
    return json(
      req,
      {
        ok: false,
        code: "UNEXPECTED",
        message: String(err?.message ?? err),
        stack: err?.stack,
        steps: [],
      },
      { status: 500 },
    );
  }
}); 