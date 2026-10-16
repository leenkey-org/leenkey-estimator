-- Sale steps and tasks per plan: SPEC-V2 section 9 ("Les six étapes",
-- validated by the client). Kept as SQL (no YAML parser dependency).
-- A = autonomie, C = accompagne, S = serenite. Task owner: who ticks it
-- ("seller", "leenkey" or "both"); Leenkey tasks never block a step.
-- auto_trigger: event that ticks the task (core/steps, L1-23).

create temporary table seed_steps (code text, position int, title text, description text) on commit drop;
insert into seed_steps values
  ('prepare', 1, 'Préparer ma vente', 'Déterminer la valeur du bien et préparer tout ce qui est nécessaire avant la commercialisation'),
  ('publish', 2, 'Créer et publier mon annonce', 'Créer une annonce attractive et mettre le bien en vente sur Leenkey'),
  ('contacts_visits', 3, 'Gérer mes contacts et mes visites', 'Centraliser les acquéreurs intéressés et organiser les visites'),
  ('offers', 4, 'Recevoir et négocier mes offres', 'Recevoir des offres structurées et décider de façon éclairée'),
  ('notary', 5, 'Préparer ma vente avec le notaire', 'Préparer un dossier complet pour que le notaire prenne le relais'),
  ('closing', 6, 'Finaliser ma vente', 'Suivre la transaction jusqu''à la signature définitive');

create temporary table seed_tasks (plans text, step_code text, code text, title text, auto_trigger text, owner text, position int) on commit drop;
insert into seed_tasks values
  -- 01 Préparer ma vente
  ('A,C,S', 'prepare', 'estimation_linked', 'Analyse de valeur faite', 'estimation.linked', 'seller', 1),
  ('A,C,S', 'prepare', 'property_complete', 'Fiche du bien complète', 'property.complete', 'seller', 2),
  ('A,C,S', 'prepare', 'photos_min6', 'Photos ajoutées, 6 minimum', 'photos.min6', 'seller', 3),
  ('A,C,S', 'prepare', 'checklist_viewed', 'Documents à préparer identifiés', 'documents.checklist_viewed', 'seller', 4),
  ('A,C,S', 'prepare', 'diagnostics_listed', 'Diagnostics nécessaires identifiés', 'documents.diagnostics_listed', 'seller', 5),
  ('C,S', 'prepare', 'price_strategy', 'Stratégie de prix définie avec le conseiller', null, 'leenkey', 6),
  ('S', 'prepare', 'sale_file_opened', 'Dossier de vente ouvert', null, 'leenkey', 7),
  ('S', 'prepare', 'documents_checked', 'Pièces disponibles contrôlées', null, 'leenkey', 8),
  ('S', 'prepare', 'missing_documents_listed', 'Pièces manquantes listées', null, 'leenkey', 9),
  -- 02 Créer et publier mon annonce
  ('A,C,S', 'publish', 'listing_written', 'Annonce rédigée', 'listing.draft_complete', 'seller', 1),
  ('A,C,S', 'publish', 'listing_submitted', 'Annonce envoyée', 'listing.submitted', 'seller', 2),
  ('A,C,S', 'publish', 'listing_published', 'Annonce en ligne', 'listing.published', 'seller', 3),
  ('C,S', 'publish', 'listing_reviewed', 'Annonce relue et optimisée par le conseiller', null, 'leenkey', 4),
  ('C,S', 'publish', 'price_reviewed', 'Prix revu avec le conseiller', null, 'leenkey', 5),
  -- 03 Gérer mes contacts et mes visites
  ('A,C,S', 'contacts_visits', 'first_contact', 'Premier contact reçu', 'conversation.created', 'seller', 1),
  ('A,C,S', 'contacts_visits', 'visit_slots_opened', 'Créneaux de visite ouverts', 'visit_slot.created', 'seller', 2),
  ('A,C,S', 'contacts_visits', 'first_visit_done', 'Première visite effectuée', 'visit.done', 'seller', 3),
  ('C,S', 'contacts_visits', 'visits_debrief', 'Point sur les retours de visite avec le conseiller', null, 'leenkey', 4),
  -- 04 Recevoir et négocier mes offres
  ('A,C,S', 'offers', 'offer_received', 'Offre reçue', 'offer.submitted', 'seller', 1),
  ('A,C,S', 'offers', 'offer_accepted', 'Offre acceptée', 'offer.accepted', 'seller', 2),
  ('C,S', 'offers', 'offer_analysed', 'Offre analysée avec le conseiller', null, 'leenkey', 3),
  ('S', 'offers', 'notary_handover_prepared', 'Transmission du dossier vers le notaire préparée', null, 'leenkey', 4),
  -- 05 Préparer ma vente avec le notaire
  ('A,C,S', 'notary', 'notary_chosen', 'Notaire choisi', null, 'seller', 1),
  ('A,C,S', 'notary', 'notary_file_complete', 'Dossier notaire complet', 'documents.notary_ready', 'seller', 2),
  ('A,C', 'notary', 'notary_file_sent', 'Dossier transmis au notaire', null, 'seller', 3),
  ('S', 'notary', 'notary_file_sent', 'Dossier transmis au notaire', null, 'leenkey', 3),
  ('A,C,S', 'notary', 'precontract_signed', 'Avant-contrat signé', null, 'both', 4),
  ('S', 'notary', 'documents_reviewed', 'Pièces contrôlées et points de vigilance signalés', null, 'leenkey', 5),
  ('S', 'notary', 'notary_coordination', 'Coordination avec le notaire en cours', null, 'leenkey', 6),
  -- 06 Finaliser ma vente
  ('A,C,S', 'closing', 'conditions_lifted', 'Conditions suspensives levées', null, 'both', 1),
  ('A,C,S', 'closing', 'deed_signed', 'Acte authentique signé', 'listing.sold', 'both', 2),
  ('S', 'closing', 'deadlines_followed', 'Échéances suivies avec le notaire', null, 'leenkey', 3);

create temporary table seed_task_rows on commit drop as
select case p when 'A' then 'autonomie' when 'C' then 'accompagne' else 'serenite' end::public.plan_code as plan,
       t.step_code, t.code, t.title, t.auto_trigger, t.owner, t.position
from seed_tasks t cross join lateral unnest(string_to_array(t.plans, ',')) as p;

-- Steps: one row per plan; the step owner is 'both' when Leenkey acts in it.
insert into public.sale_steps (plan, code, position, title, description, owner, auto_trigger)
select pl.plan, s.code, s.position, s.title, s.description,
       case when exists (select 1 from seed_task_rows r
                         where r.plan = pl.plan and r.step_code = s.code and r.owner in ('leenkey', 'both'))
            then 'both' else 'seller' end,
       null
from seed_steps s
cross join (values ('autonomie'::public.plan_code), ('accompagne'), ('serenite')) as pl(plan)
on conflict (plan, code) do update set
  position = excluded.position, title = excluded.title,
  description = excluded.description, owner = excluded.owner;

insert into public.sale_step_tasks (step_id, code, title, auto_trigger, required, position, owner)
select st.id, r.code, r.title, r.auto_trigger, r.owner <> 'leenkey', r.position, r.owner
from seed_task_rows r
join public.sale_steps st on st.plan = r.plan and st.code = r.step_code
on conflict (step_id, code) do update set
  title = excluded.title, auto_trigger = excluded.auto_trigger,
  required = excluded.required, position = excluded.position, owner = excluded.owner;
