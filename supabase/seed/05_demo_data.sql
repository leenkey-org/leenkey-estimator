-- Demo data (SPEC-V2 section 22): 16 fictitious properties in the launch zone
-- (SPEC section 20): 12 published, 3 pending, 1 rejected; two paid plans with
-- their advisor conversation, buyer conversations, favorites, daily views.
-- Addresses are fictitious; coordinates are approximate (commune centres).
-- Rows are created once: a property that already exists is left as the
-- recette made it, so running the seed again never undoes testing work.
-- Photos: loaded after this file by scripts/seed-photos.mjs (L1-46, files in
-- Storage). Not seeded yet: the two offers (L2-01, offers table).

create temporary table seed_props (
  n int, owner text, type public.property_type, address_line text, postal_code text, city text,
  lat double precision, lng double precision, surface_m2 numeric, rooms int, bedrooms int,
  floor int, floors_total int, has_elevator boolean, has_balcony boolean, has_terrace boolean,
  has_garden boolean, has_parking boolean, has_cellar boolean, orientation text, build_year int,
  dpe_class char(1), ges_class char(1), heating text, charges_monthly_cents int,
  property_tax_yearly_cents int, copro_lots int,
  estimation_value_cents bigint, estimation_low_cents bigint, estimation_high_cents bigint,
  title text, description text, price_cents bigint, status public.listing_status,
  days_ago int, plan public.plan_code
) on commit drop;

insert into seed_props values
  (1, 'a', 'appartement', '18 rue de la Gare', '91600', 'Savigny-sur-Orge', 48.6818, 2.3489,
   68, 3, 2, 2, 4, true, true, false, false, true, true, 'Sud-ouest', 1972, 'D', 'D', 'Collectif gaz', 21000, 115000, 48,
   24500000, 23200000, 25800000,
   'Appartement 3 pièces avec balcon, proche gare',
   'Au 2e étage avec ascenseur d''une résidence calme, appartement traversant de 68 m² : séjour lumineux ouvrant sur un balcon exposé sud-ouest, cuisine séparée aménagée, deux chambres, salle de bains avec fenêtre. Place de parking en sous-sol et cave. Gare RER C, écoles et commerces à pied. Chauffage collectif au gaz compris dans les charges.',
   23900000, 'published', 12, 'accompagne'),
  (2, 'a', 'maison', '7 allée des Tilleuls', '91360', 'Épinay-sur-Orge', 48.6741, 2.3247,
   112, 5, 3, null, 2, null, false, true, true, true, false, 'Sud', 1985, 'D', 'E', 'Individuel gaz', null, 198000, null,
   null, null, null,
   'Maison familiale 5 pièces avec jardin',
   'Maison de 1985 sur deux niveaux, au calme d''une allée résidentielle. Au rez-de-chaussée : entrée, séjour double ouvert sur la terrasse et le jardin, cuisine équipée, WC. À l''étage : trois chambres, salle de bains et salle d''eau. Garage et place de stationnement devant la maison. Écoles primaires et gare à proximité.',
   42900000, 'published', 25, 'autonomie'),
  (3, 'a', 'appartement', '4 place du Marché', '91390', 'Morsang-sur-Orge', 48.6626, 2.3516,
   45, 2, 1, 1, 3, false, false, false, false, false, true, 'Est', 1965, 'E', 'E', 'Collectif gaz', 16000, 82000, 22,
   null, null, null,
   '2 pièces de 45 m² proche du centre',
   'Au 1er étage d''une petite copropriété, deux-pièces de 45 m² : entrée avec placard, séjour, cuisine séparée, chambre, salle d''eau refaite en 2021. Cave. Idéal pour un premier achat ou un investissement locatif. Commerces, marché et bus au pied de l''immeuble.',
   15900000, 'published', 5, 'autonomie'),
  (4, 'a', 'terrain', 'Chemin des Vignes', '91310', 'Montlhéry', 48.6402, 2.2689,
   620, 0, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 45000, null,
   null, null, null,
   'Terrain à bâtir de 620 m², viabilisé',
   'Terrain plat de 620 m² en zone pavillonnaire, viabilisé (eau, électricité, assainissement collectif en bordure). Façade de 18 m. Hors lotissement, libre de constructeur. Certificat d''urbanisme disponible sur demande. Centre de Montlhéry et accès à la N20 à quelques minutes.',
   18900000, 'published', 40, 'autonomie'),
  (5, 'a', 'appartement', '22 avenue de la République', '91260', 'Juvisy-sur-Orge', 48.6893, 2.3769,
   82, 4, 3, 5, 7, true, true, false, false, true, false, 'Ouest', 1990, 'C', 'C', 'Collectif gaz', 24000, 140000, 120,
   null, null, null,
   '4 pièces de 82 m² au 5e étage, vue dégagée',
   'Dans une résidence de 1990 avec gardien, appartement de 82 m² au 5e étage avec ascenseur : séjour de 28 m² prolongé par un balcon, cuisine ouverte équipée, trois chambres, salle de bains, WC séparés. Place de parking privative. Gare de Juvisy (RER C et D) à 8 minutes à pied.',
   27900000, 'published', 3, 'autonomie'),
  (6, 'a', 'maison', '15 rue des Écoles', '91700', 'Villiers-sur-Orge', 48.6566, 2.3031,
   96, 5, 3, null, 1, null, false, false, true, true, true, 'Sud', 1958, 'F', 'E', 'Individuel fioul', null, 175000, null,
   37200000, 35000000, 39500000,
   'Maison 5 pièces à rafraîchir avec jardin',
   'Maison de 1958 de plain-pied sur sous-sol total, sur un terrain arboré. Séjour double, cuisine, trois chambres, salle d''eau. Sous-sol avec garage, buanderie et atelier. Travaux de rafraîchissement à prévoir, toiture refaite en 2015.',
   36500000, 'pending', 1, 'autonomie'),
  (7, 'a', 'appartement', '3 rue Pasteur', '91160', 'Longjumeau', 48.6935, 2.2978,
   58, 3, 2, 3, 5, false, false, false, false, true, false, 'Est-ouest', 1978, 'D', 'D', 'Individuel électrique', 14500, 98000, 36,
   21400000, 20300000, 22600000,
   '3 pièces de 58 m² avec parking',
   'Au 3e étage sans ascenseur, appartement de trois pièces : séjour, cuisine aménagée, deux chambres, salle de bains. Double vitrage récent, parking extérieur dans la résidence. Centre-ville, commerces et bus vers la gare de Massy à proximité.',
   20900000, 'pending', 2, 'autonomie'),
  (8, 'b', 'maison', '9 impasse des Vergers', '91700', 'Sainte-Geneviève-des-Bois', 48.6431, 2.3238,
   135, 6, 4, null, 2, null, false, true, true, true, false, 'Sud', 2004, 'C', 'B', 'Pompe à chaleur', null, 245000, null,
   null, null, null,
   'Maison récente 6 pièces, jardin et terrasse',
   'Maison de 2004 en parfait état, au fond d''une impasse : grand séjour avec cuisine ouverte donnant sur une terrasse en bois et un jardin clos, quatre chambres dont une suite parentale au rez-de-chaussée, deux salles d''eau, bureau. Garage et deux places de stationnement. Écoles, collège et gare RER C accessibles à pied.',
   48900000, 'published', 18, 'serenite'),
  (9, 'b', 'appartement', '11 rue du Général Leclerc', '91170', 'Viry-Châtillon', 48.6713, 2.3731,
   71, 3, 2, 8, 12, true, true, false, false, true, true, 'Est-ouest', 1968, 'D', 'E', 'Collectif gaz', 26000, 120000, 180,
   null, null, null,
   '3 pièces de 71 m² au 8e étage avec vue',
   'Appartement traversant au 8e étage avec ascenseur : séjour avec balcon, cuisine indépendante, deux chambres, salle de bains, nombreux rangements. Cave et place de parking en sous-sol. Copropriété bien entretenue. Lac et commerces proches.',
   19900000, 'published', 30, 'autonomie'),
  (10, 'b', 'maison', '2 impasse des Lilas', '91420', 'Morangis', 48.7041, 2.3378,
   104, 5, 3, null, 1, null, false, false, true, true, true, 'Sud-est', 1975, 'E', 'E', 'Individuel gaz', null, 190000, null,
   null, null, null,
   'Maison 5 pièces sur sous-sol avec jardin',
   'Maison de 1975 sur sous-sol total, dans un quartier pavillonnaire calme : séjour de 30 m² ouvert sur le jardin, cuisine équipée, trois chambres, bureau, salle de bains. Sous-sol avec garage double et chaufferie. Fenêtres changées en 2019. Écoles et bus à proximité.',
   39900000, 'published', 9, 'autonomie'),
  (11, 'b', 'appartement', '6 rue de Paris', '91380', 'Chilly-Mazarin', 48.7023, 2.3149,
   63, 3, 2, 1, 4, true, true, false, false, true, false, 'Sud', 2012, 'B', 'A', 'Individuel gaz', 12000, 130000, 40,
   null, null, null,
   '3 pièces récent avec balcon et parking',
   'Dans une résidence de 2012, appartement de 63 m² au 1er étage : séjour avec cuisine ouverte et balcon, deux chambres avec placards, salle de bains, WC séparés. Place de parking en sous-sol. Charges modérées. Bus vers la gare de Massy et accès rapide à l''A6.',
   25500000, 'published', 14, 'autonomie'),
  (12, 'b', 'appartement', '27 avenue Jean Jaurès', '91200', 'Athis-Mons', 48.7082, 2.3858,
   38, 2, 1, 4, 6, true, false, false, false, false, true, 'Nord-est', 1970, 'E', 'D', 'Individuel électrique', 13000, 78000, 90,
   null, null, null,
   '2 pièces de 38 m² avec ascenseur',
   'Au 4e étage avec ascenseur, deux-pièces lumineux : séjour, cuisine ouverte, chambre, salle d''eau. Idéal pour un premier achat ou un investissement locatif. Gare à 10 minutes à pied, commerces au pied de la résidence.',
   13900000, 'published', 21, 'autonomie'),
  (13, 'b', 'maison', '12 rue de la Mairie', '91160', 'Ballainvilliers', 48.6762, 2.2986,
   150, 7, 5, null, 3, null, false, true, true, true, true, 'Sud-ouest', 1930, 'E', 'F', 'Individuel gaz', null, 290000, null,
   null, null, null,
   'Meulière de 1930 rénovée, 7 pièces',
   'Maison en meulière de 1930 rénovée avec soin, sur un terrain de 700 m². Rez-de-chaussée : entrée, double séjour avec cheminée, cuisine équipée, WC. Étage : quatre chambres et salle de bains. Dernier niveau : une chambre sous combles avec salle d''eau. Cave, terrasse, garage. Écoles et centre du village à proximité.',
   59900000, 'published', 7, 'autonomie'),
  (14, 'b', 'maison', '5 rue des Peupliers', '91620', 'La Ville-du-Bois', 48.6588, 2.2672,
   88, 4, 3, null, 2, null, false, false, true, true, false, 'Sud', 1995, 'D', 'C', 'Individuel gaz', null, 170000, null,
   null, null, null,
   'Maison 4 pièces avec jardin',
   'Maison de 1995 sur deux niveaux : séjour lumineux ouvert sur le jardin, cuisine aménagée, trois chambres à l''étage, salle de bains. Garage attenant. Quartier résidentiel calme, écoles et commerces à proximité.',
   33900000, 'published', 45, 'autonomie'),
  (15, 'b', 'appartement', '8 rue Jules Ferry', '91360', 'Villemoisson-sur-Orge', 48.6662, 2.3337,
   52, 2, 1, 0, 3, false, false, false, true, true, false, 'Sud', 2008, 'C', 'B', 'Pompe à chaleur', 9500, 95000, 30,
   19200000, 18200000, 20300000,
   '2 pièces en rez-de-jardin',
   'En rez-de-jardin d''une résidence de 2008, deux-pièces de 52 m² avec jardin privatif de 40 m² : séjour, cuisine ouverte, chambre, salle d''eau. Place de parking. Calme, proche des bords de l''Orge.',
   18900000, 'pending', 0, 'autonomie'),
  (16, 'b', 'appartement', '14 rue Carnot', '91350', 'Grigny', 48.6551, 2.3897,
   66, 3, 2, 6, 10, true, false, false, false, false, false, 'Ouest', 1971, 'F', 'E', 'Collectif gaz', 22000, 110000, 250,
   18100000, 17000000, 19200000,
   'Appartement 3 pièces',
   '3 pièces à vendre, bon état.',
   17500000, 'rejected', 4, 'autonomie');

create temporary table seed_ids on commit drop as
select n, ('5eed1000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid as property_id,
       case owner when 'a' then '5eed0000-0000-4000-8000-00000000000a'
                  else '5eed0000-0000-4000-8000-00000000000b' end::uuid as owner_id
from seed_props;

create temporary table seed_new (property_id uuid primary key) on commit drop;
create temporary table seed_new_listings (listing_id uuid primary key, property_id uuid) on commit drop;

-- Properties (the trigger creates sale_progress: Autonomie, first step).
with ins as (
  insert into public.properties (
    id, owner_id, type, address_line, postal_code, city, location, surface_m2, rooms, bedrooms,
    floor, floors_total, has_elevator, has_balcony, has_terrace, has_garden, has_parking, has_cellar,
    orientation, build_year, dpe_class, ges_class, heating, charges_monthly_cents,
    property_tax_yearly_cents, copro_lots, estimation_value_cents, estimation_low_cents,
    estimation_high_cents, created_at)
  select i.property_id, i.owner_id, p.type, p.address_line, p.postal_code, p.city,
         extensions.st_setsrid(extensions.st_makepoint(p.lng, p.lat), 4326)::extensions.geography,
         p.surface_m2, p.rooms, p.bedrooms, p.floor, p.floors_total, p.has_elevator, p.has_balcony,
         p.has_terrace, p.has_garden, p.has_parking, p.has_cellar, p.orientation, p.build_year,
         p.dpe_class, p.ges_class, p.heating, p.charges_monthly_cents, p.property_tax_yearly_cents,
         p.copro_lots, p.estimation_value_cents, p.estimation_low_cents, p.estimation_high_cents,
         now() - make_interval(days => p.days_ago + 10)
  from seed_props p join seed_ids i using (n)
  on conflict (id) do nothing
  returning id
)
insert into seed_new select id from ins;

-- Listings: created as drafts by the trigger, then put in their status.
with ins as (
  insert into public.listings (property_id, title, description, price_cents, created_at)
  select i.property_id, p.title, p.description, p.price_cents, now() - make_interval(days => p.days_ago + 3)
  from seed_props p join seed_ids i using (n)
  where i.property_id in (select property_id from seed_new)
    and not exists (select 1 from public.listings l where l.property_id = i.property_id)
  returning id, property_id
)
insert into seed_new_listings select id, property_id from ins;

update public.listings l
   set status = p.status,
       submitted_at = case when p.status = 'published' then now() - make_interval(days => p.days_ago + 1)
                           else now() - make_interval(days => p.days_ago, hours => 3) end,
       published_at = case when p.status = 'published' then now() - make_interval(days => p.days_ago) end,
       rejection_reason = case when p.status = 'rejected' then
         'La description est trop courte pour être publiée : précisez l''étage, l''exposition, les pièces et les charges, puis renvoyez l''annonce.' end
  from seed_new_listings nl
  join seed_ids i on i.property_id = nl.property_id
  join seed_props p using (n)
 where l.id = nl.listing_id;

update public.sale_progress sp
   set plan = p.plan,
       current_step_code = case when p.status = 'published' then 'contacts_visits' else 'publish' end
  from seed_ids i join seed_props p using (n)
 where sp.property_id = i.property_id and i.property_id in (select property_id from seed_new);

-- Paid plans: Accompagné on property 1, Sérénité on property 8 (12-month term set by trigger).
insert into public.subscriptions (id, property_id, owner_id, plan, amount_paid_cents, activated_at)
select s.id, i.property_id, i.owner_id, s.plan, s.amount, now() - make_interval(days => s.days_ago)
from (values ('5eed4000-0000-4000-8000-000000000001'::uuid, 1, 'accompagne'::public.plan_code, 99000, 20),
             ('5eed4000-0000-4000-8000-000000000008'::uuid, 8, 'serenite'::public.plan_code, 150000, 25))
     as s(id, n, plan, amount, days_ago)
join seed_ids i using (n)
where i.property_id in (select property_id from seed_new)
on conflict do nothing;

-- Conversations: advisor (paid plans) and buyer contacts.
insert into public.conversations (id, kind, property_id, listing_id, seller_id, buyer_id, created_at)
select c.id, c.kind, i.property_id,
       case when c.kind = 'listing' then (select l.id from public.listings l where l.property_id = i.property_id) end,
       i.owner_id, c.buyer_id, now() - make_interval(days => c.days_ago)
from (values
  ('5eed2000-0000-4000-8000-000000000001'::uuid, 1, 'advisor'::public.conversation_kind, null::uuid, 20),
  ('5eed2000-0000-4000-8000-000000000008'::uuid, 8, 'advisor'::public.conversation_kind, null::uuid, 25),
  ('5eed2000-0000-4000-8000-000000000011'::uuid, 1, 'listing'::public.conversation_kind, '5eed0000-0000-4000-8000-00000000000c'::uuid, 6),
  ('5eed2000-0000-4000-8000-000000000012'::uuid, 1, 'listing'::public.conversation_kind, '5eed0000-0000-4000-8000-00000000000d'::uuid, 2),
  ('5eed2000-0000-4000-8000-000000000018'::uuid, 8, 'listing'::public.conversation_kind, '5eed0000-0000-4000-8000-00000000000d'::uuid, 3))
  as c(id, n, kind, buyer_id, days_ago)
join seed_ids i using (n)
where i.property_id in (select property_id from seed_new)
on conflict do nothing;

-- Messages in chronological order (the trigger updates last_message_at and read marks).
insert into public.messages (id, conversation_id, sender_id, body, kind, created_at)
select m.id, m.conversation_id, m.sender_id, m.body, m.kind, now() - m.age
from (values
  ('5eed3000-0000-4000-8000-000000000101'::uuid, '5eed2000-0000-4000-8000-000000000001'::uuid,
   '5eed0000-0000-4000-8000-0000000000ad'::uuid, 'system',
   'Bonjour, je suis votre conseiller Leenkey pour la vente de votre bien. Écrivez-moi ici à tout moment : je vous réponds sous 24 h.',
   interval '20 days'),
  ('5eed3000-0000-4000-8000-000000000801'::uuid, '5eed2000-0000-4000-8000-000000000008'::uuid,
   '5eed0000-0000-4000-8000-0000000000ad'::uuid, 'system',
   'Bonjour, je suis votre conseiller Leenkey pour la vente de votre bien. Écrivez-moi ici à tout moment : je vous réponds sous 24 h.',
   interval '25 days'),
  ('5eed3000-0000-4000-8000-000000001101'::uuid, '5eed2000-0000-4000-8000-000000000011'::uuid,
   '5eed0000-0000-4000-8000-00000000000c'::uuid, 'text',
   'Bonjour, l''appartement est-il toujours disponible ? Je cherche une résidence principale, mon financement est en cours avec ma banque.',
   interval '6 days'),
  ('5eed3000-0000-4000-8000-000000001102'::uuid, '5eed2000-0000-4000-8000-000000000011'::uuid,
   '5eed0000-0000-4000-8000-00000000000a'::uuid, 'text',
   'Bonjour Chloé, oui, il est toujours disponible. Je peux vous proposer une visite samedi matin ou mercredi en fin de journée.',
   interval '5 days 22 hours'),
  ('5eed3000-0000-4000-8000-000000001103'::uuid, '5eed2000-0000-4000-8000-000000000011'::uuid,
   '5eed0000-0000-4000-8000-00000000000c'::uuid, 'text',
   'Samedi matin me convient très bien. La place de parking est-elle comprise dans le prix ?',
   interval '5 days'),
  ('5eed3000-0000-4000-8000-000000001104'::uuid, '5eed2000-0000-4000-8000-000000000011'::uuid,
   '5eed0000-0000-4000-8000-00000000000a'::uuid, 'text',
   'Oui, la place de parking en sous-sol et la cave sont comprises.',
   interval '4 days 23 hours'),
  ('5eed3000-0000-4000-8000-000000001201'::uuid, '5eed2000-0000-4000-8000-000000000012'::uuid,
   '5eed0000-0000-4000-8000-00000000000d'::uuid, 'text',
   'Bonjour, les charges comprennent-elles le chauffage ?',
   interval '2 days'),
  ('5eed3000-0000-4000-8000-000000001202'::uuid, '5eed2000-0000-4000-8000-000000000012'::uuid,
   '5eed0000-0000-4000-8000-00000000000a'::uuid, 'text',
   'Bonjour, oui, le chauffage collectif est compris dans les charges de 210 € par mois.',
   interval '1 day 20 hours'),
  ('5eed3000-0000-4000-8000-000000001801'::uuid, '5eed2000-0000-4000-8000-000000000018'::uuid,
   '5eed0000-0000-4000-8000-00000000000d'::uuid, 'text',
   'Bonjour, nous cherchons une maison avec jardin pour la rentrée. Le quartier est-il calme ?',
   interval '3 days'),
  ('5eed3000-0000-4000-8000-000000001802'::uuid, '5eed2000-0000-4000-8000-000000000018'::uuid,
   '5eed0000-0000-4000-8000-00000000000b'::uuid, 'text',
   'Bonjour, oui, la maison est au fond d''une impasse et l''école primaire est à 5 minutes à pied.',
   interval '2 days 21 hours'),
  ('5eed3000-0000-4000-8000-000000001803'::uuid, '5eed2000-0000-4000-8000-000000000018'::uuid,
   '5eed0000-0000-4000-8000-00000000000d'::uuid, 'text',
   'Merci. Serait-il possible de la visiter la semaine prochaine ?',
   interval '2 days'))
  as m(id, conversation_id, sender_id, kind, body, age)
where m.conversation_id in (select c.id from public.conversations c
                            where c.property_id in (select property_id from seed_new))
order by m.age desc
on conflict do nothing;

-- Task progress coherent with each status (core/steps, L1-23, ticks them in real use).
insert into public.sale_task_status (property_id, task_id, done_at, done_by)
select sp.property_id, t.id, coalesce(l.submitted_at, now()),
       case when coalesce(t.owner, s.owner) = 'leenkey' then '5eed0000-0000-4000-8000-0000000000ad'::uuid
            else p.owner_id end
from public.sale_progress sp
join public.properties p on p.id = sp.property_id
join public.listings l on l.property_id = p.id
join public.sale_steps cur on cur.plan = sp.plan and cur.code = sp.current_step_code
join public.sale_steps s on s.plan = sp.plan
join public.sale_step_tasks t on t.step_id = s.id
where sp.property_id in (select property_id from seed_new)
  and (s.position < cur.position
       or (s.code = 'publish' and l.status = 'pending' and t.code in ('listing_written', 'listing_submitted'))
       or (s.code = 'publish' and l.status = 'rejected' and t.code = 'listing_written')
       or (t.code = 'first_contact' and exists (select 1 from public.conversations c
                                                where c.property_id = p.id and c.kind = 'listing')))
on conflict do nothing;

-- Favorites
insert into public.favorites (buyer_id, listing_id)
select f.buyer_id, l.id
from (values ('5eed0000-0000-4000-8000-00000000000c'::uuid, 1), ('5eed0000-0000-4000-8000-00000000000c'::uuid, 2),
             ('5eed0000-0000-4000-8000-00000000000c'::uuid, 5), ('5eed0000-0000-4000-8000-00000000000d'::uuid, 8),
             ('5eed0000-0000-4000-8000-00000000000d'::uuid, 10)) as f(buyer_id, n)
join seed_ids i using (n)
join public.listings l on l.property_id = i.property_id
where i.property_id in (select property_id from seed_new)
on conflict do nothing;

-- Test data of L1-18, put back by every db:seed (local and preprod): buyer_c
-- keeps the listing 16, refused, a favourite that is no longer online.
-- tests/e2e/favorites.spec.ts removes it.
insert into public.favorites (buyer_id, listing_id)
select '5eed0000-0000-4000-8000-00000000000c'::uuid, l.id
from seed_ids i
join public.listings l on l.property_id = i.property_id
where i.n = 16 and l.status <> 'published'
on conflict do nothing;

-- Daily views since publication (14 days at most), deterministic counts.
insert into public.listing_views (listing_id, day, count)
select l.id, d::date, 4 + abs(hashtext(l.id::text || d::date::text)::bigint) % 22
from public.listings l
cross join lateral generate_series(l.published_at::date,
                                   least((now() at time zone 'Europe/Paris')::date, l.published_at::date + 13),
                                   interval '1 day') as d
where l.id in (select listing_id from seed_new_listings) and l.published_at is not null
on conflict do nothing;

update public.listings l
   set views_count = v.total
  from (select listing_id, sum(count)::int as total from public.listing_views group by listing_id) v
 where v.listing_id = l.id and l.id in (select listing_id from seed_new_listings);
