import { z } from "zod";

export const QuestionZ = z.object({
  id: z.string(),        // uuid
  text: z.string().min(1)
});

export const SubSubsectionZ = z.object({
  id: z.string(),        // uuid
  number: z.string().min(1),     // "4.1"
  title: z.string().min(1),
  questions: z.array(QuestionZ).default([]),
  general_questions: z.array(QuestionZ).default([]),
});

export const SubsectionZ = z.object({
  id: z.string(),        // uuid
  number: z.string().min(1),     // "4.0"
  title: z.string().min(1),
  questions: z.array(QuestionZ).default([]),          // general at this level
  general_questions: z.array(QuestionZ).default([]),
  subsubsections: z.array(SubSubsectionZ).default([]),
});

export const SectionZ = z.object({
  id: z.string(),        // uuid
  number: z.string().min(1),     // "1", "2", "4"
  title: z.string().min(1),
  questions: z.array(QuestionZ).default([]),          // section-level general
  general_questions: z.array(QuestionZ).default([]),
  subsections: z.array(SubsectionZ).default([]),
});

export const GuideZ = z.object({
  sections: z.array(SectionZ).min(1, "Add at least one section"),
});

export type Guide = z.infer<typeof GuideZ>;
export type Section = z.infer<typeof SectionZ>;
export type Subsection = z.infer<typeof SubsectionZ>;
export type SubSubsection = z.infer<typeof SubSubsectionZ>;
export type Question = z.infer<typeof QuestionZ>; 