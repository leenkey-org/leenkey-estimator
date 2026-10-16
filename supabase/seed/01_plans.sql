-- Plans and entitlements. Texts: SPEC-V2 section 11 bis (client texts, kept as
-- provided; taglines in "on" until Cédric answers DECISIONS Q18).
-- description: first line shown before the feature list, following lines after it.
-- stripe_price_id is filled by L1-26 from STRIPE_PRICE_* (test or live).

insert into public.plans (code, name, tagline, price_cents, scope, description, features, position, active) values
  ('autonomie', 'Autonomie', 'Tous les outils pour vendre vous-même.', 0, 'property',
   'Sans engagement.',
   array[
     'Analyse et rapport de valeur du bien',
     'Espace vendeur',
     'Création de la fiche du bien',
     'Création et rédaction de l''annonce avec l''IA',
     'Publication de l''annonce sur Leenkey',
     'Tableau de bord de suivi de la vente',
     'Messagerie avec les acquéreurs',
     'Agenda et demandes de visites',
     'Accès aux informations déclarées par les acquéreurs',
     'Réception des offres d''achat structurées',
     'Assistant IA Leenkey pour vous accompagner dans le parcours',
     'Checklist des étapes de la vente',
     'Identification des documents et diagnostics à préparer'
   ], 1, true),
  ('accompagne', 'Accompagné', 'Vous vendez. On vous accompagne à chaque étape.', 99000, 'property',
   E'Tout Autonomie, plus :\nLe propriétaire continue de gérer sa vente et réalise ses visites.',
   array[
     'Conseiller Leenkey dédié',
     'Stratégie de prix et de mise en vente',
     'Échanges avec le conseiller pendant la commercialisation',
     'Relecture et optimisation humaine de l''annonce',
     'Conseils sur les photos et la présentation du bien',
     'Suivi de la performance de l''annonce',
     'Ajustement de la stratégie de vente si nécessaire',
     'Accompagnement dans la gestion des acquéreurs',
     'Conseils pour préparer les visites',
     'Analyse des offres reçues',
     'Analyse des informations et justificatifs de financement disponibles',
     'Aide à la négociation',
     'Accompagnement jusqu''à l''acceptation d''une offre'
   ], 2, true),
  ('serenite', 'Sérénité', 'On pilote avec vous jusqu''à la signature.', 150000, 'property',
   'Tout Accompagné, plus :',
   array[
     'Constitution du dossier de vente complet',
     'Contrôle des pièces nécessaires',
     'Identification et suivi des documents manquants',
     'Anticipation des diagnostics nécessaires',
     'Analyse des documents',
     'Signalement des éventuels points de vigilance',
     'Préparation du dossier destiné au notaire',
     'Coordination avec le notaire',
     'Suivi de l''avancement du dossier',
     'Accompagnement jusqu''au compromis ou avant-contrat',
     'Suivi des conditions suspensives',
     'Accompagnement jusqu''à la signature définitive'
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
