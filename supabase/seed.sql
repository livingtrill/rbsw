-- ═══════════════════════════════════════════════════════════════════════════
-- Real Black Wall Street — Seed Data
-- Run AFTER schema.sql in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════


-- ── CATEGORIES ───────────────────────────────────────────────────────────────
-- IDs will auto-assign 1–10 in insertion order
insert into categories (slug, name, icon) values
  ('food-restaurant',      'Food & Restaurant',     '🍽'),
  ('fashion-apparel',      'Fashion & Apparel',     '👗'),
  ('health-wellness',      'Health & Wellness',     '🌿'),
  ('technology',           'Technology',            '💻'),
  ('beauty-personal-care', 'Beauty & Personal Care','✨'),
  ('art-creative',         'Art & Creative',        '🎨'),
  ('finance-legal',        'Finance & Legal',       '⚖'),
  ('education-tutoring',   'Education & Tutoring',  '📚'),
  ('freelancers',          'Freelancers',           '💼'),
  ('handyman-services',    'Handyman Services',     '🔧');

-- Resulting IDs:
--  1 = Food & Restaurant      6 = Art & Creative
--  2 = Fashion & Apparel      7 = Finance & Legal
--  3 = Health & Wellness      8 = Education & Tutoring
--  4 = Technology             9 = Freelancers
--  5 = Beauty & Personal Care 10 = Handyman Services


-- ── TAGS ─────────────────────────────────────────────────────────────────────
insert into tags (name) values
  ('Soul Food'),('Farm-to-Table'),('Sunday Brunch'),('Catering'),
  ('Screen Print'),('Sustainable'),('Graphic Apparel'),('Handmade'),
  ('Civic Tech'),('Accessibility'),('Web Dev'),('Nonprofits'),('Cloud'),
  ('Herbalism'),('Acupuncture'),('Holistic'),('Community Workshops'),
  ('Nigerian'),('Pastry'),('Puff-Puff'),('Weekend Pop-up'),
  ('Skincare'),('Apothecary'),('Korean Herbalism'),('Small Batch'),
  ('Financial Planning'),('Wealth Building'),('Bilingual'),('Tax Strategy'),
  ('Streetwear'),('Organic Cotton'),('Limited Drops'),('Heritage'),
  ('TCM'),('Cupping'),('Sliding Scale'),
  ('Brand Identity'),('Illustration'),('Murals'),('Editorial'),
  ('IT Services'),('Cybersecurity'),('SMB'),
  ('Natural Hair'),('Braiding'),('Locs'),('Luxury'),
  ('Tutoring'),('SAT Prep'),('College Counseling'),('Title I'),
  ('Oaxacan'),('Tacos'),('Heirloom Corn'),('Family-Run'),('Mole'),
  ('Motion Design'),('Branding'),('Logo Animation'),('Social Content'),
  ('Copywriting'),('Content Strategy'),('SEO'),('Brand Voice'),
  ('Drywall'),('Tile'),('Deck Building'),('Smart Home'),('Repairs'),
  ('Plumbing'),('Electrical'),('Painting'),('Property Maintenance');


-- ── BUSINESSES ───────────────────────────────────────────────────────────────
-- Using subqueries on slug so category_id always matches the categories table
insert into businesses
  (slug, name, category_id, owner_name, city, state_code, location, address,
   phone, email, website, hours, price_range, rating, review_count,
   short_desc, description, image_url, image_alt, featured, status, lat, lng)
values

( 'nourish-kitchen-co', 'Nourish Kitchen Co.',
  (select id from categories where slug='food-restaurant'),
  'Chef Tamara Williams', 'Atlanta', 'GA', 'West End, Atlanta',
  '745 Lee St SW, Atlanta, GA 30310', '+1 (404) 555-0182', 'tamara@nourishkitchen.co',
  'nourishkitchen.co', 'Tue–Sun 11am–9pm', '$$', 4.9, 687,
  'Farm-to-table soul food rooted in West African and Southern tradition, sourcing from local Georgia farms.',
  'A farm-to-table soul food kitchen rooted in West African and Southern tradition. Chef Tamara sources ingredients from local Georgia farms, crafting dishes that are simultaneously ancestral and modern. The Sunday brunch line wraps around the block for good reason.',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
  'Nourish Kitchen Co. vibrant dining room with local art',
  true, 'approved', 33.749000, -84.400500 ),

( 'sol-thread-studio', 'Sol Thread Studio',
  (select id from categories where slug='fashion-apparel'),
  'Isabella Morales', 'Los Angeles', 'CA', 'East LA',
  '3212 César Chávez Ave, Los Angeles, CA 90063', '+1 (323) 555-0241', 'hola@solthread.com',
  'solthread.com', 'Mon–Sat 10am–6pm', '$$', 4.8, 334,
  'Independent fashion label hand-printing bold graphic tees and accessories in a zero-waste studio.',
  'An independent fashion label hand-printing bold graphic tees, hoodies, and woven accessories inspired by folk art and contemporary culture. Every garment is screen-printed in-house in a zero-waste studio.',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64',
  'Sol Thread Studio colorful garments and screen printing equipment',
  true, 'approved', 34.021900, -118.181700 ),

( 'pillar-code-labs', 'Pillar Code Labs',
  (select id from categories where slug='technology'),
  'Marcus & Deja Thompson', 'Washington', 'DC', 'Shaw, DC',
  '1520 9th St NW, Washington, DC 20001', '+1 (202) 555-0368', 'hello@pillarcode.io',
  'pillarcode.io', 'Mon–Fri 9am–5pm', '$$$', 4.9, 142,
  'Software consultancy building accessible civic tech and cloud infrastructure for nonprofits.',
  'A software consultancy specializing in civic tech, accessibility-first web development, and cloud infrastructure for nonprofits and government agencies. Founded by two Howard University alumni who came up through military service.',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c',
  'Pillar Code Labs team collaborating in modern DC office',
  false, 'approved', 38.913200, -77.020900 ),

( 'golden-roots-wellness', 'Golden Roots Wellness',
  (select id from categories where slug='health-wellness'),
  'Dr. Aisha Bankole', 'Chicago', 'IL', 'Bronzeville, Chicago',
  '4727 S King Dr, Chicago, IL 60615', '+1 (312) 555-0597', 'hello@goldenrootswellness.com',
  'goldenrootswellness.com', 'Mon–Sat 9am–7pm', '$$', 4.8, 419,
  'Holistic wellness center grounded in herbalism and integrative medicine led by a naturopathic doctor.',
  'A holistic wellness center grounded in herbalism and integrative medicine. Dr. Aisha Bankole, a naturopathic doctor and licensed acupuncturist, offers a full spectrum of services from herbal consultations to massage therapy to community wellness workshops.',
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef',
  'Golden Roots Wellness serene interior with plants and natural light',
  true, 'approved', 41.807500, -87.615500 ),

( 'three-crowns-bakery', 'Three Crowns Bakery',
  (select id from categories where slug='food-restaurant'),
  'Adaeze Okonkwo', 'Houston', 'TX', 'Third Ward, Houston',
  '3214 Dowling St, Houston, TX 77004', '+1 (713) 555-0714', 'hello@threecrownsbakery.com',
  'threecrownsbakery.com', 'Wed–Sun 7am–2pm', '$', 4.9, 528,
  'Nigerian-inspired bakery fusing traditional pastry with Houston bold flavor — famous for spiced croissants.',
  'This bakery fuses Nigerian pastry tradition with Houston''s bold flavor identity. Signature chin-chin, puff-puff, and a smash-hit Nigerian-spiced croissant that sold out for 47 consecutive weekends.',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff',
  'Three Crowns Bakery colorful pastry display case',
  true, 'approved', 29.740400, -95.369800 ),

( 'hana-bloom-botanicals', 'Hana Bloom Botanicals',
  (select id from categories where slug='beauty-personal-care'),
  'Keiko Tanaka', 'New York', 'NY', 'Ridgewood, Queens',
  '60-14 Forest Ave, Ridgewood, NY 11385', '+1 (718) 555-0139', 'keiko@hanabloombotanicals.com',
  'hanabloombotanicals.com', 'Tue–Sun 11am–7pm', '$$$', 4.7, 283,
  'Apothecary making plant-based skincare from Japanese and Korean herbal traditions — small batch, fragrance-free.',
  'An apothecary creating small-batch, plant-based skincare drawing from Japanese forest bathing and Korean herbal medicine. Every product is handcrafted, fragrance-free, and formulated for sensitive skin.',
  'https://images.unsplash.com/photo-1556228578-0d85b1a4d571',
  'Hana Bloom Botanicals minimalist apothecary with glass bottles',
  false, 'approved', 40.702100, -73.902800 ),

( 'libertas-financial-group', 'Libertas Financial Group',
  (select id from categories where slug='finance-legal'),
  'Monique Hayes, CFP', 'Miami', 'FL', 'Liberty City, Miami',
  '6301 NW 7th Ave, Miami, FL 33150', '+1 (305) 555-0843', 'monique@libertasfinancial.com',
  'libertasfinancial.com', 'Mon–Fri 9am–6pm', '$$$', 4.8, 167,
  'Financial planning firm serving first-generation wealth builders with bilingual tax strategy and retirement planning.',
  'A financial planning and wealth-building firm serving first-generation wealth builders. Monique Hayes, a Certified Financial Planner, offers tax strategy, retirement planning, and financial literacy workshops in English and Spanish.',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f',
  'Libertas Financial Group modern office with consultation tables',
  false, 'approved', 25.853600, -80.200600 ),

( 'kinfolk-apparel', 'Kinfolk Apparel',
  (select id from categories where slug='fashion-apparel'),
  'Darius Cole', 'Atlanta', 'GA', 'Sweet Auburn, Atlanta',
  '248 Auburn Ave NE, Atlanta, GA 30303', '+1 (404) 555-0426', 'hello@kinfolkapparel.com',
  'kinfolkapparel.com', 'Mon–Sat 11am–7pm', '$$', 4.7, 521,
  'Atlanta streetwear brand designing each drop around a chapter of cultural history, in premium organic cotton.',
  'Atlanta-born streetwear brand rooted in cultural history and heritage. Darius Cole designs each drop around a specific historical chapter, rendered in contemporary silhouettes with premium organic cotton.',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b',
  'Kinfolk Apparel curated clothing display in brick storefront',
  false, 'approved', 33.754600, -84.377600 ),

( 'verdant-acupuncture', 'Verdant Acupuncture & Herbs',
  (select id from categories where slug='health-wellness'),
  'Dr. Linh Nguyen, L.Ac', 'Houston', 'TX', 'Midtown Houston',
  '3909 Main St, Houston, TX 77002', '+1 (713) 555-0295', 'info@verdantacupuncture.com',
  'verdantacupuncture.com', 'Mon, Wed, Fri 9am–6pm; Sat 10am–4pm', '$$', 4.9, 362,
  'TCM clinic offering acupuncture, cupping, and sliding-scale community sessions.',
  'A Traditional Chinese Medicine clinic offering acupuncture, cupping, herbal medicine, and community acupuncture sliding-scale sessions. Dr. Linh Nguyen was trained in both Hanoi and at AOMA Graduate School of Integrative Medicine.',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874',
  'Verdant Acupuncture calm treatment room with bamboo decor',
  false, 'approved', 29.734000, -95.369800 ),

( 'colorwork-collective', 'Colorwork Collective',
  (select id from categories where slug='art-creative'),
  'Nia Osei-Bonsu', 'New York', 'NY', 'Bed-Stuy, Brooklyn',
  '764 Jefferson Ave, Brooklyn, NY 11221', '+1 (646) 555-0772', 'nia@colorworkcollective.com',
  'colorworkcollective.com', 'By Appointment', '$$$', 4.8, 203,
  'Brand identity and illustration studio whose work has appeared in NYT and Vogue.',
  'A creative studio offering brand identity, illustration, mural commissions, and editorial design to businesses prioritizing authentic cultural storytelling. Work has appeared in The New York Times, Vogue, and dozens of nonprofits worldwide.',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
  'Colorwork Collective studio with vibrant murals and illustration work',
  true, 'approved', 40.684000, -73.924900 ),

( 'tecla-technology-solutions', 'Tecla Technology Solutions',
  (select id from categories where slug='technology'),
  'Rosa Méndez', 'Chicago', 'IL', 'Pilsen, Chicago',
  '1801 S Blue Island Ave, Chicago, IL 60608', '+1 (312) 555-0584', 'rosa@teclatech.com',
  'teclatech.com', 'Mon–Fri 8am–6pm', '$$', 4.6, 119,
  'IT firm providing bilingual cybersecurity and cloud services to small businesses.',
  'An IT managed services firm providing cybersecurity, cloud migration, and tech support for small businesses — in both English and Spanish. Rosa Méndez started Tecla after recognizing the digital divide leaving many small business owners without infrastructure to compete.',
  'https://images.unsplash.com/photo-1580894732444-8ecded7900cd',
  'Tecla Technology Solutions office with team at monitors',
  false, 'approved', 41.857000, -87.659900 ),

( 'mahogany-beauty-lounge', 'Mahogany Beauty Lounge',
  (select id from categories where slug='beauty-personal-care'),
  'Jasmine Carter', 'Atlanta', 'GA', 'Decatur, Atlanta',
  '103 E Ponce de Leon Ave, Decatur, GA 30030', '+1 (404) 555-0913', 'book@mahoganybeauty.com',
  'mahoganybeauty.com', 'Tue–Sat 9am–7pm', '$$$', 4.9, 864,
  'Luxury beauty lounge specializing in natural hair, braiding, and locs — appointments book 6 weeks out.',
  'A full-service luxury beauty lounge specializing in natural hair care, braiding, locs, and holistic beauty rituals. Jasmine Carter opened Mahogany after 15 years of building a loyal clientele. Appointments open 6 weeks out — that''s how good it is.',
  'https://images.unsplash.com/photo-1562322140-8baeececf3df',
  'Mahogany Beauty Lounge elegant salon interior',
  true, 'approved', 33.775000, -84.296700 ),

( 'village-roots-tutoring', 'Village Roots Tutoring',
  (select id from categories where slug='education-tutoring'),
  'Dr. Keturah Moore', 'Washington', 'DC', 'Anacostia, DC',
  '2107 Good Hope Rd SE, Washington, DC 20020', '+1 (202) 555-0124', 'dr.moore@villageroots.edu',
  'villageroots.edu', 'Mon–Fri 3pm–8pm, Sat 9am–2pm', '$$', 4.8, 247,
  'Culturally responsive tutoring and college counseling for Title I students in Southeast DC.',
  'An education company providing culturally responsive tutoring, SAT prep, and college counseling to students from Title I schools in Southeast DC. Dr. Moore leads a team of 18 educators, all from the communities they serve.',
  'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45',
  'Village Roots Tutoring bright classroom with students',
  false, 'approved', 38.861400, -76.985500 ),

( 'mesa-verde-taqueria', 'Mesa Verde Taqueria',
  (select id from categories where slug='food-restaurant'),
  'Carlos & Elena Reyes', 'Los Angeles', 'CA', 'Boyle Heights, LA',
  '1718 E César Chávez Ave, Los Angeles, CA 90033', '+1 (323) 555-0648', 'hola@mesaverdetaqueria.com',
  'mesaverdetaqueria.com', 'Daily 10am–10pm', '$', 4.8, 712,
  'Family-run Oaxacan taqueria with masa ground from heirloom corn and a legendary 3-day mole negro.',
  'A family-run taqueria serving Oaxacan-inspired street tacos made from masa ground in-house from heirloom corn. Carlos and Elena opened Mesa Verde after years of weekend pop-ups in Boyle Heights. The mole negro here is a 3-day labor of love.',
  'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
  'Mesa Verde Taqueria colorful interior with handmade tortillas',
  false, 'approved', 34.049800, -118.206500 ),

( 'pixel-fox-creative', 'Pixel Fox Creative',
  (select id from categories where slug='freelancers'),
  'Jordan Kim', 'New York', 'NY', 'Brooklyn, NY',
  'Brooklyn, NY 11201', '+1 (917) 555-0334', 'hi@pixelfoxcreative.com',
  'pixelfoxcreative.com', 'By Appointment', '$$', 4.8, 94,
  'Freelance motion designer and brand strategist creating visual identities and animated content for brands.',
  'A freelance motion designer and brand strategist with 8 years of experience crafting visual identities for startups and established brands. Specializes in logo animation, social content, and brand style guides. Available for short-term projects and ongoing retainers.',
  'https://images.unsplash.com/photo-1611532736597-de2d4265fba3',
  'Pixel Fox Creative home studio with design work displayed',
  false, 'approved', 40.689200, -73.944200 ),

( 'clara-writes', 'Clara Writes',
  (select id from categories where slug='freelancers'),
  'Clara Nguyen', 'Chicago', 'IL', 'Logan Square, Chicago',
  'Logan Square, Chicago, IL 60647', '+1 (773) 555-0217', 'clara@clarawrites.com',
  'clarawrites.com', 'Mon–Fri 9am–5pm', '$$', 4.9, 87,
  'Freelance copywriter and content strategist helping brands find their voice with compelling copy.',
  'Award-winning freelance copywriter and content strategist specializing in long-form journalism, brand voice development, and SEO-driven website copy. Clara has written for national publications and helped 60+ small businesses find their voice online.',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a',
  'Clara Writes desk with laptop and notebooks',
  false, 'approved', 41.921500, -87.702000 ),

( 'apex-home-repair', 'Apex Home Repair',
  (select id from categories where slug='handyman-services'),
  'Mike Patterson', 'Atlanta', 'GA', 'Buckhead, Atlanta',
  'Buckhead, Atlanta, GA 30305', '+1 (404) 555-0178', 'mike@apexhomerepair.com',
  'apexhomerepair.com', 'Mon–Sat 7am–6pm', '$$', 4.9, 312,
  'Licensed handyman for drywall, tile, decks, and smart home installs — 20 years experience, always on time.',
  'A licensed and insured handyman service handling everything from drywall repair and tile installation to deck building and smart home setup. Mike has 20 years of trade experience and a reputation for showing up on time and getting it done right the first time.',
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
  'Apex Home Repair handyman installing fixtures',
  false, 'approved', 33.840300, -84.367700 ),

( 'greenleaf-property-services', 'Greenleaf Property Services',
  (select id from categories where slug='handyman-services'),
  'Tom & Sarah Greene', 'Houston', 'TX', 'Midtown Houston',
  'Midtown Houston, TX 77002', '+1 (713) 555-0493', 'hello@greenleafproperty.com',
  'greenleafproperty.com', 'Mon–Fri 8am–5pm, Sat 8am–12pm', '$$', 4.7, 241,
  'Family-run property maintenance covering plumbing, electrical, painting, and seasonal upkeep.',
  'Family-run property maintenance company offering plumbing fixes, electrical repairs, painting, and seasonal maintenance for homeowners and property managers. With a team of 6 skilled tradespeople, Greenleaf handles jobs of any size with a 100% satisfaction guarantee.',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1',
  'Greenleaf Property Services team at work on home repairs',
  false, 'approved', 29.734000, -95.369800 );


-- ── BUSINESS TAGS ─────────────────────────────────────────────────────────────
-- Uses slug + name lookups so IDs don't need to be hardcoded
insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'nourish-kitchen-co'
  and t.name in ('Soul Food','Farm-to-Table','Sunday Brunch','Catering');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'sol-thread-studio'
  and t.name in ('Screen Print','Sustainable','Graphic Apparel','Handmade');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'pillar-code-labs'
  and t.name in ('Civic Tech','Accessibility','Web Dev','Nonprofits','Cloud');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'golden-roots-wellness'
  and t.name in ('Herbalism','Acupuncture','Holistic','Community Workshops');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'three-crowns-bakery'
  and t.name in ('Nigerian','Pastry','Puff-Puff','Catering','Weekend Pop-up');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'hana-bloom-botanicals'
  and t.name in ('Skincare','Apothecary','Korean Herbalism','Small Batch');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'libertas-financial-group'
  and t.name in ('Financial Planning','Wealth Building','Bilingual','Tax Strategy');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'kinfolk-apparel'
  and t.name in ('Streetwear','Organic Cotton','Limited Drops','Heritage');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'verdant-acupuncture'
  and t.name in ('Acupuncture','TCM','Cupping','Sliding Scale');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'colorwork-collective'
  and t.name in ('Brand Identity','Illustration','Murals','Editorial');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'tecla-technology-solutions'
  and t.name in ('IT Services','Cybersecurity','Bilingual','Cloud','SMB');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'mahogany-beauty-lounge'
  and t.name in ('Natural Hair','Braiding','Locs','Luxury');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'village-roots-tutoring'
  and t.name in ('Tutoring','SAT Prep','College Counseling','Title I');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'mesa-verde-taqueria'
  and t.name in ('Oaxacan','Tacos','Heirloom Corn','Family-Run','Mole');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'pixel-fox-creative'
  and t.name in ('Motion Design','Branding','Logo Animation','Social Content');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'clara-writes'
  and t.name in ('Copywriting','Content Strategy','SEO','Brand Voice');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'apex-home-repair'
  and t.name in ('Drywall','Tile','Deck Building','Smart Home','Repairs');

insert into business_tags (business_id, tag_id)
select b.id, t.id from businesses b cross join tags t
where b.slug = 'greenleaf-property-services'
  and t.name in ('Plumbing','Electrical','Painting','Property Maintenance');
