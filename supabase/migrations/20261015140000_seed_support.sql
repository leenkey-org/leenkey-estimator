-- L1-06: schema support for the reference data.
-- 1. Who ticks a task. SPEC section 9 assigns tasks to the seller or to
--    Leenkey within the same step ("vendeur" / "Leenkey"), and section 5
--    lets sellers tick tasks whose owner is seller or both, but sale_step_tasks
--    had no owner column (DECISIONS 2026-10-15). The task owner wins; when it
--    is null the step owner applies.
-- 2. Idempotent import of the knowledge base: one row per (source file,
--    category, question); the same question can appear in two categories.

alter table public.sale_step_tasks
  add column owner text check (owner in ('seller','leenkey','both'));

create or replace function public.sale_task_is_seller_owned(p_task_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sale_step_tasks t join public.sale_steps s on s.id = t.step_id
                 where t.id = p_task_id and coalesce(t.owner, s.owner) in ('seller', 'both'));
$$;

create unique index knowledge_base_source_question_idx
  on public.knowledge_base (source_file, category, question);
