-- Plans and entitlements. Texts: SPEC-V2 section 11 bis, the plans as Younes
-- worded them on 2026-11-06 (DECISIONS.md), taglines in « nous ».
-- description: first line shown before the feature list (empty: none),
-- following lines after it. The price stays in price_cents only.
-- stripe_price_id is filled by L1-26 from STRIPE_PRICE_* (test or live).

insert into public.plans (code, name, tagline, price_cents, scope, description, features, position, active) values
  ('autonomie', 'Autonomie', 'Tous les outils pour gérer votre vente vous-même.', 0, 'property',
   E'\nGratuit, sans carte bancaire et sans obligation de passer à une formule payante.',
   array[
     'Rapport de valeur de votre bien',
     'Création et publication de votre annonce sur Leenkey avec l''aide de l''IA',
     'Espace personnel et suivi de votre vente',
     'Messagerie et gestion des demandes de visite',
     'Réception des offres d''achat',
     'Accès aux informations communiquées par les acquéreurs',
     'Assistant IA disponible pour vous guider à chaque étape',
     'Checklist et liste des documents à préparer'
   ], 1, true),
  ('accompagne', 'Accompagné', 'Vous gérez votre vente, un conseiller vous accompagne à chaque étape.', 99000, 'property',
   E'Tout Autonomie, plus :\nForfait fixe par bien · 12 mois d''accompagnement',
   array[
     'Un conseiller Leenkey dédié',
     'Un regard personnalisé sur votre prix et votre stratégie de vente',
     'Relecture et optimisation de votre annonce',
     'Recommandations pour valoriser votre bien et préparer les visites',
     'Suivi des performances de votre annonce et pistes d''amélioration',
     'Accompagnement pour préparer vos échanges avec les acquéreurs',
     'Analyse des offres reçues et des informations de financement communiquées',
     'Aide à la décision jusqu''à l''acceptation d''une offre'
   ], 2, true),
  ('serenite', 'Sérénité', 'Votre vente avance, nous vous accompagnons jusqu''à la signature.', 150000, 'property',
   E'Tout Accompagné, plus :\nForfait fixe par bien · 12 mois d''accompagnement',
   array[
     'Préparation de votre dossier de vente : organisation des documents, diagnostics et identification des pièces manquantes.',
     'Analyse des documents : lecture des pièces disponibles et signalement des éventuels points de vigilance.',
     'Suivi jusqu''à la signature : accompagnement dans les démarches après l''acceptation de l''offre, rappels des échéances importantes et aide à la préparation des échanges avec le notaire.'
   ], 3, true)
on conflict (code) do update set
  name = excluded.name, tagline = excluded.tagline, price_cents = excluded.price_cents,
  scope = excluded.scope, description = excluded.description, features = excluded.features,
  position = excluded.position, active = excluded.active;

-- Entitlements: SPEC-V2 section 11 bis, "Droits (plan_entitlements)".
create temporary table seed_entitlements on commit drop as
select p.plan::public.plan_code as plan, f.feature::public.plan_feature as feature
from (values ('accompagne'), ('serenite')) as p(plan)
cross join (values ('advisor'), ('human_price_strategy'), ('human_listing_review'),
                   ('human_offer_analysis'), ('negotiation_support')) as f(feature)
union all
select 'serenite'::public.plan_code, f.feature::public.plan_feature
from (values ('sale_file_building'), ('deep_document_review'),
             ('notary_coordination'), ('closing_follow_up')) as f(feature);

insert into public.plan_entitlements (plan, feature)
select plan, feature from seed_entitlements
on conflict do nothing;

delete from public.plan_entitlements e
where not exists (select 1 from seed_entitlements s where s.plan = e.plan and s.feature = e.feature);
