import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://hncwnykfqeyghlpfygyw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuY3dueWtmcWV5Z2hscGZ5Z3l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI4MTY1MCwiZXhwIjoyMDkxODU3NjUwfQ.nQNFFbfQwo4F6eOSgZQMksFl5cYBjjSGuX1zm5G5Ang'
)

const leads = [
  // ─── PRIORIDAD 5 — TOP ──────────────────────────────────────────────────────
  { name: 'The Pelican Sunset Bar', phone: '+5016100624', company: 'The Pelican Sunset Bar', project_type: 'Bar', notes: 'PRIORIDAD 5 — TOP. Caye Caulker, Belize. Aventurera Street. Rating 4.6 (890 reseñas). WA: https://wa.me/5016100624' },
  { name: 'Ice and Beans Café', phone: '+5016625089', company: 'Ice and Beans Café', project_type: 'Restaurante', notes: 'PRIORIDAD 5 — TOP. Caye Caulker, Belize. Front Street / Beachfront. Rating 4.6 (1,591 reseñas). WA: https://wa.me/5016625089' },
  { name: "Reina's", phone: '+5016224014', company: "Reina's", project_type: 'Restaurante', notes: 'PRIORIDAD 5 — TOP. Caye Caulker, Belize. Avenida Langosta. Rating 4.6 (680 reseñas). WA: https://wa.me/5016224014' },
  { name: "Chef Juan's Kitchen and Pastries", phone: '+5016303534', company: "Chef Juan's Kitchen and Pastries", project_type: 'Restaurante', notes: 'PRIORIDAD 5 — TOP. Caye Caulker, Belize. 64 Crocodile Street. Rating 4.7 (568 reseñas). WA: https://wa.me/5016303534' },
  { name: 'Il Pellicano Cucina Italiana', phone: '+5012260660', company: 'Il Pellicano Cucina Italiana', project_type: 'Restaurante', notes: 'PRIORIDAD 5 — TOP. Caye Caulker, Belize. 49 Pasero Street. Rating 4.5 (564 reseñas). WA: https://wa.me/5012260660' },
  { name: 'Caveman Snorkeling Tours', phone: '+5012260367', company: 'Caveman Snorkeling Tours', project_type: 'Tours', notes: 'PRIORIDAD 5 — TOP. Caye Caulker, Belize. Rating 4.9 (820 reseñas). "El Caveman" personaje icónico de la isla, 2,400+ FB likes, historia de vida fuerte. Web: https://cavemansnorkelingtours.com — WA: https://wa.me/5012260367' },
  { name: 'Anwar Tours', phone: '+5012260327', company: 'Anwar Tours', project_type: 'Tours', notes: 'PRIORIDAD 5 — TOP. Caye Caulker, Belize. Avenida Hicaco. Rating 4.9 (767 reseñas). Familia Novelo desde 1993. Contactos: Javier y Erico Novelo Jr. 30+ años de experiencia. Web: https://www.anwartours.bz — WA: https://wa.me/5012260327' },
  { name: 'Ragga Sailing Adventures', phone: '+5016277273', company: 'Ragga Sailing Adventures', project_type: 'Tours', notes: 'PRIORIDAD 5 — TOP. Caye Caulker, Belize. Front Street. Rating 4.9 (685 reseñas). 3 catamaranes (Ragga Phoenix 50ft, King, Gal). Captains: Ish, Shane. Chef: Linthon. Tours 3-day/2-night. Marca fuerte establecida. Web: http://www.raggasailadventures.com — WA: https://wa.me/5016277273' },
  { name: 'Salt Life Eco Tours', phone: '+5016355624', company: 'Salt Life Eco Tours', project_type: 'Tours', notes: 'PRIORIDAD 5 — TOP. Caye Caulker, Belize. Playa Asuncion. Rating 4.7 (562 reseñas). WA: https://wa.me/5016355624' },

  // ─── PRIORIDAD 4 — Muy buenos ───────────────────────────────────────────────
  { name: 'The Lazy Lizard', phone: '+5012260655', company: 'The Lazy Lizard', project_type: 'Bar', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Front Street, The Split. Rating 4.4 (2,429 reseñas). Dueño Jim Lynskey (Miami). El bar más famoso de CC. 13K IG followers. Tiene El Portal (upstairs lounge) + eventos privados + weddings. 450+ seats. Web: https://www.lazylizardbarandgrill.com — WA: https://wa.me/5012260655' },
  { name: "Salty's", phone: '+5016355464', company: "Salty's", project_type: 'Bar', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Calle del Sol. Rating 4.8 (398 reseñas). WA: https://wa.me/5016355464' },
  { name: 'Bliss Beach', phone: '+5016088030', company: 'Bliss Beach', project_type: 'Bar', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. North Caye Caulker. Rating 4.8 (339 reseñas). WA: https://wa.me/5016088030' },
  { name: 'Island Magic Beach Resort', phone: '+5012260505', company: 'Island Magic Beach Resort', project_type: 'Hotel', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Avenida Hicaco. Rating 4.5 (393 reseñas). Manager Alina. WA directo: +501 631-3125. Conference & Retreat Center, Weddings. Email: reservations@islandmagicbelize.com / alina@islandmagicbelize.com — WA: https://wa.me/5012260505' },
  { name: "Weezie's Ocean Front Hotel and Garden Cottages", phone: '+19703762167', company: "Weezie's Ocean Front Hotel", project_type: 'Hotel', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Playa Asuncion. Rating 4.7 (339 reseñas). Manager Roberto. Café/Bar + yoga + 18 rooms. Dueños en Colorado USA. Boutique hotel. Email: weeziescayecaulker@gmail.com — WA: https://wa.me/19703762167' },
  { name: 'Colinda Cabanas', phone: '+5012260383', company: 'Colinda Cabanas', project_type: 'Hotel', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Playa Asuncion. Rating 4.9 (280 reseñas). Contacto Emilita. #1 Hotel en TripAdvisor. 14 rooms. Hacen eventos (bodas, aniversarios). Email: info@colindacabanas.com — WA: https://wa.me/5012260383' },
  { name: 'Blu Zen Caye Caulker', phone: '+5016152799', company: 'Blu Zen Caye Caulker', project_type: 'Hotel', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. North Side. Rating 4.6 (249 reseñas). WA: https://wa.me/5016152799' },
  { name: "Maggie's Sunset Kitchen", phone: '+5016334530', company: "Maggie's Sunset Kitchen", project_type: 'Restaurante', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Linds Cocal. Rating 4.4 (546 reseñas). WA: https://wa.me/5016334530' },
  { name: 'Pasta per Caso', phone: '+5016026670', company: 'Pasta per Caso', project_type: 'Restaurante', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Avenida Hicaco. Rating 4.7 (464 reseñas). Dueños Anna & Armando (pareja italiana). Cash only. Cerrado L-M. 2 seatings: 5:30pm y 7:30pm. Pasta a mano diaria. WA: https://wa.me/5016026670' },
  { name: "Elba's Little Kitchen", phone: '+5016330490', company: "Elba's Little Kitchen", project_type: 'Restaurante', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. off Luciano Reyes Street. Rating 4.8 (424 reseñas). WA: https://wa.me/5016330490' },
  { name: "Chef Kareem's Unbelizable Lunch", phone: '+5016088936', company: "Chef Kareem's Unbelizable Lunch", project_type: 'Restaurante', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Front Street. Rating 4.7 (411 reseñas). WA: https://wa.me/5016088936' },
  { name: 'Amor y Cafe', phone: null, company: 'Amor y Cafe', project_type: 'Restaurante', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Playa Asuncion. Rating 4.5 (391 reseñas). Sin teléfono.' },
  { name: 'Caye Caulker Reef Friendly Tours', phone: '+5016332275', company: 'Caye Caulker Reef Friendly Tours', project_type: 'Tours', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Avenida Hicaco. Rating 4.8 (348 reseñas). Negocio familiar 37+ años. Eco-friendly. Fundadores Amado & Bert. 15+ años en ecoturismo. Web: https://cayecaulkerreeffriendlytours.com — WA: https://wa.me/5016332275' },
  { name: 'Carlos Snorkeling Tours', phone: '+5016333440', company: 'Carlos Snorkeling Tours', project_type: 'Tours', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Rating 5.0 (311 reseñas). WA: https://wa.me/5016333440' },
  { name: 'Sunrise Scuba, Snorkeling and Tours', phone: '+5016088111', company: 'Sunrise Scuba, Snorkeling and Tours', project_type: 'Tours', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Avenida Hicaco. Rating 4.8 (302 reseñas). WA: https://wa.me/5016088111' },
  { name: 'BlackHawk Tours Ltd.', phone: '+5016118661', company: 'BlackHawk Tours Ltd.', project_type: 'Tours', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Rating 4.9 (283 reseñas). WA: https://wa.me/5016118661' },
  { name: 'Scuba Sensation', phone: '+5016112331', company: 'Scuba Sensation', project_type: 'Tours', notes: 'PRIORIDAD 4 — MUY BUENO. Caye Caulker, Belize. Rating 4.9 (257 reseñas). WA: https://wa.me/5016112331' },

  // ─── PRIORIDAD 3 ────────────────────────────────────────────────────────────
  { name: "Sip N' Dip", phone: null, company: "Sip N' Dip", project_type: 'Bar', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Playa Asuncion. Rating 4.3 (300 reseñas).' },
  { name: 'Bounty Bay Beach Club', phone: '+5016115004', company: 'Bounty Bay Beach Club', project_type: 'Bar', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.8 (68 reseñas). WA: https://wa.me/5016115004' },
  { name: "Bender's Beach Bar", phone: '+5016063910', company: "Bender's Beach Bar", project_type: 'Bar', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Front Street. Rating 4.8 (52 reseñas). WA: https://wa.me/5016063910' },
  { name: 'Tropical Paradise Hotel', phone: '+5012260124', company: 'Tropical Paradise Hotel', project_type: 'Hotel', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Luciano Reyes Street. Rating 3.8 (443 reseñas). 100% Belizean-owned desde 1978. Restaurant + golf carts + tours. Email: tropicalparadisebz@gmail.com — WA: https://wa.me/5012260124' },
  { name: "Bella's Backpackers Hostel", phone: '+5012260360', company: "Bella's Backpackers Hostel", project_type: 'Hotel', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 3.5 (335 reseñas). WA: https://wa.me/5012260360' },
  { name: 'Barefoot Beach Belize Hotel', phone: '+5016116942', company: 'Barefoot Beach Belize Hotel', project_type: 'Hotel', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.3 (239 reseñas). Tiki beach bar + taqueria. Snorkel + sunset cruises + golf cart rentals. Web: https://www.barefootbeachbelize.com — WA: https://wa.me/5016116942' },
  { name: 'Barefoot Caye Caulker Hotel', phone: '+5016142273', company: 'Barefoot Caye Caulker Hotel', project_type: 'Hotel', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Lot 55 Avenida Hicaco. Rating 4.5 (151 reseñas). Ubicación premium en main strip. Private dock. Email: reservations@barefootcayecaulker.com — WA: https://wa.me/5016142273' },
  { name: 'Seaside Cabanas', phone: '+5012260498', company: 'Seaside Cabanas', project_type: 'Hotel', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.6 (131 reseñas). 17 rooms. Pool + cocktail bar. Al lado del ferry de San Pedro. Managers Vivian y Nikki. Web: https://seasidecabanasbelize.com — WA: https://wa.me/5012260498' },
  { name: 'Sea n Sun Guest House', phone: '+5016300360', company: 'Sea n Sun Guest House', project_type: 'Hotel', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.9 (125 reseñas). WA: https://wa.me/5016300360' },
  { name: 'Dream Cabanas', phone: '+5016359778', company: 'Dream Cabanas', project_type: 'Hotel', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.7 (107 reseñas). WA: https://wa.me/5016359778' },
  { name: 'Yocamatsu', phone: '+5016303960', company: 'Yocamatsu', project_type: 'Hotel', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.7 (67 reseñas). WA: https://wa.me/5016303960' },
  { name: 'Caye Caulker Boutique Guest House Hotel', phone: '+5016228444', company: 'Caye Caulker Boutique Guest House Hotel', project_type: 'Hotel', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.7 (58 reseñas). Dueños Ron y Rhonda. Manager Gene. WA: https://wa.me/5016228444' },
  { name: 'The Happy Lobster', phone: '+5012260064', company: 'The Happy Lobster', project_type: 'Restaurante', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.3 (494 reseñas). WA: https://wa.me/5012260064' },
  { name: 'Namaste Café', phone: null, company: 'Namaste Café', project_type: 'Restaurante', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Pasero Street. Rating 4.4 (332 reseñas).' },
  { name: 'The Magic Cup', phone: '+5016228866', company: 'The Magic Cup', project_type: 'Restaurante', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.5 (197 reseñas). WA: https://wa.me/5016228866' },
  { name: 'Las Palapas Belize Restaurant', phone: '+5016155691', company: 'Las Palapas Belize Restaurant', project_type: 'Restaurante', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.8 (148 reseñas). WA: https://wa.me/5016155691' },
  { name: 'Suggestion Gourmet French Restaurant', phone: '+5016308396', company: 'Suggestion Gourmet French Restaurant', project_type: 'Restaurante', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.6 (129 reseñas). WA: https://wa.me/5016308396' },
  { name: 'North Side Happy Lobster', phone: '+5016063383', company: 'North Side Happy Lobster', project_type: 'Restaurante', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.8 (107 reseñas). WA: https://wa.me/5016063383' },
  { name: 'Agave Bar and Grill', phone: '+5016324992', company: 'Agave Bar and Grill', project_type: 'Restaurante', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.7 (74 reseñas). WA: https://wa.me/5016324992' },
  { name: "Nicco's", phone: null, company: "Nicco's", project_type: 'Restaurante', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Avenida Hicaco. Rating 4.5 (61 reseñas).' },
  { name: 'The Backyard', phone: null, company: 'The Backyard', project_type: 'Restaurante', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Pasero Street. Rating 4.7 (55 reseñas).' },
  { name: 'Caye Caulker TIPSY Pizza', phone: '+5016502610', company: 'Caye Caulker TIPSY Pizza', project_type: 'Restaurante', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.9 (51 reseñas). WA: https://wa.me/5016502610' },
  { name: "Ix'Chel Day Spa", phone: '+5016336222', company: "Ix'Chel Day Spa", project_type: 'Spa', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Playa Asuncion. Rating 4.9 (128 reseñas). WA: https://wa.me/5016336222' },
  { name: 'Purple Passion Wellness Spa', phone: '+5016620137', company: 'Purple Passion Wellness Spa', project_type: 'Spa', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.9 (128 reseñas). WA: https://wa.me/5016620137' },
  { name: 'Julz Holistic Massage Studio', phone: '+5016081541', company: 'Julz Holistic Massage Studio', project_type: 'Spa', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 5.0 (85 reseñas). WA: https://wa.me/5016081541' },
  { name: "Frenchie's Diving Services", phone: '+5012260234', company: "Frenchie's Diving Services", project_type: 'Tours', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.3 (421 reseñas). WA: https://wa.me/5012260234' },
  { name: 'E-Z Boy Tours', phone: '+5016150343', company: 'E-Z Boy Tours', project_type: 'Tours', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.7 (200 reseñas). WA: https://wa.me/5016150343' },
  { name: 'Good Vibes Tours', phone: '+5016268238', company: 'Good Vibes Tours', project_type: 'Tours', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.9 (146 reseñas). WA: https://wa.me/5016268238' },
  { name: 'Nauti Time Tours', phone: '+5016077097', company: 'Nauti Time Tours', project_type: 'Tours', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 5.0 (146 reseñas). WA: https://wa.me/5016077097' },
  { name: 'Wanderlust Sailing and Snorkeling', phone: '+5016134344', company: 'Wanderlust Sailing and Snorkeling', project_type: 'Tours', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.9 (118 reseñas). Belize Tourism Gold Standard Tour Operator. Catamaranes + speedboats. Tours privados. Web: https://www.wanderlustsailingcc.com — WA: https://wa.me/5016134344' },
  { name: 'Star Tours', phone: '+5016399251', company: 'Star Tours', project_type: 'Tours', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.8 (104 reseñas). WA: https://wa.me/5016399251' },
  { name: 'Look Hook & Cook Tours', phone: '+5016361805', company: 'Look Hook & Cook Tours', project_type: 'Tours', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.9 (91 reseñas). WA: https://wa.me/5016361805' },
  { name: 'Captain Ron Adventures', phone: null, company: 'Captain Ron Adventures', project_type: 'Tours', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Avenida Langosta. Rating 5.0 (87 reseñas).' },
  { name: 'Knotty Tours', phone: '+5016285114', company: 'Knotty Tours', project_type: 'Tours', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 5.0 (82 reseñas). WA: https://wa.me/5016285114' },
  { name: 'Salty Sailing Belize', phone: '+5016353528', company: 'Salty Sailing Belize', project_type: 'Tours', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.8 (77 reseñas). WA: https://wa.me/5016353528' },
  { name: 'The Spearfishing Shack', phone: null, company: 'The Spearfishing Shack', project_type: 'Tours', notes: 'PRIORIDAD 3. Caye Caulker, Belize. North Side. Rating 5.0 (61 reseñas).' },
  { name: 'Reef Snorkeling Tours', phone: '+5016313539', company: 'Reef Snorkeling Tours', project_type: 'Tours', notes: 'PRIORIDAD 3. Caye Caulker, Belize. Rating 4.8 (51 reseñas). WA: https://wa.me/5016313539' },

  // ─── PRIORIDAD 2 ────────────────────────────────────────────────────────────
  { name: 'Boozy Eel Beach Bar', phone: '+5016111084', company: 'Boozy Eel Beach Bar', project_type: 'Bar', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.3 (65 reseñas). WA: https://wa.me/5016111084' },
  { name: 'Mangrove Beach Cafe & Lounge', phone: '+5012260360', company: 'Mangrove Beach Cafe & Lounge', project_type: 'Bar', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (6 reseñas). WA: https://wa.me/5012260360' },
  { name: 'Caye Caulker Beach Hotel', phone: '+5012260288', company: 'Caye Caulker Beach Hotel', project_type: 'Hotel', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.0 (149 reseñas). WA: https://wa.me/5012260288' },
  { name: 'The Caye Hotel at Caye Caulker', phone: '+5012260226', company: 'The Caye Hotel at Caye Caulker', project_type: 'Hotel', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.2 (51 reseñas). WA: https://wa.me/5012260226' },
  { name: 'Oasi', phone: '+5016239401', company: 'Oasi', project_type: 'Hotel', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.7 (44 reseñas). WA: https://wa.me/5016239401' },
  { name: 'Caye Caulker Towers', phone: '+5012260025', company: 'Caye Caulker Towers', project_type: 'Hotel', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.6 (16 reseñas). WA: https://wa.me/5012260025' },
  { name: 'Zenses Hotel & Resort', phone: '+5016561876', company: 'Zenses Hotel & Resort', project_type: 'Hotel', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.5 (15 reseñas). WA: https://wa.me/5016561876' },
  { name: 'Caye Living Properties Real Estate', phone: '+5012260375', company: 'Caye Living Properties Real Estate', project_type: 'Real Estate', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.8 (4 reseñas). WA: https://wa.me/5012260375' },
  { name: 'Premier Realty Belize', phone: '+5016115131', company: 'Premier Realty Belize', project_type: 'Real Estate', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (4 reseñas). WA: https://wa.me/5016115131' },
  { name: 'Caye Dreams Real Estate', phone: '+5012260398', company: 'Caye Dreams Real Estate', project_type: 'Real Estate', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.5 (2 reseñas). WA: https://wa.me/5012260398' },
  { name: 'Mango Realty Belize', phone: '+5016019907', company: 'Mango Realty Belize', project_type: 'Real Estate', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (2 reseñas). WA: https://wa.me/5016019907' },
  { name: "Buddy's Golf Cart Rental", phone: '+5016288508', company: "Buddy's Golf Cart Rental", project_type: 'Renta', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (12 reseñas). WA: https://wa.me/5016288508' },
  { name: 'J&SONS XTREME KARTS', phone: '+5016014330', company: 'J&SONS XTREME KARTS', project_type: 'Renta', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (3 reseñas). WA: https://wa.me/5016014330' },
  { name: 'C & N Golf Cart Rental', phone: '+5016154021', company: 'C & N Golf Cart Rental', project_type: 'Renta', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (1 reseña). WA: https://wa.me/5016154021' },
  { name: 'Southside Pizza', phone: '+5016333887', company: 'Southside Pizza', project_type: 'Restaurante', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.4 (152 reseñas). WA: https://wa.me/5016333887' },
  { name: 'Caye Breeze Cafe', phone: null, company: 'Caye Breeze Cafe', project_type: 'Restaurante', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Playa Asuncion. Rating 4.7 (46 reseñas).' },
  { name: 'Korner Stop Cafe', phone: '+5016155534', company: 'Korner Stop Cafe', project_type: 'Restaurante', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (44 reseñas). WA: https://wa.me/5016155534' },
  { name: 'Coco Gardens Restaurant', phone: '+5016134518', company: 'Coco Gardens Restaurant', project_type: 'Restaurante', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.5 (37 reseñas). WA: https://wa.me/5016134518' },
  { name: 'Los Almendros', phone: '+5016363097', company: 'Los Almendros', project_type: 'Restaurante', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (17 reseñas). WA: https://wa.me/5016363097' },
  { name: "Dawn's Garden Kitchen", phone: '+5016149150', company: "Dawn's Garden Kitchen", project_type: 'Restaurante', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.8 (16 reseñas). WA: https://wa.me/5016149150' },
  { name: 'Story Beach & Tapas Bar', phone: null, company: 'Story Beach & Tapas Bar', project_type: 'Restaurante', notes: 'PRIORIDAD 2. Caye Caulker, Belize. North Island. Rating 5.0 (11 reseñas).' },
  { name: 'Sweet Season', phone: null, company: 'Sweet Season', project_type: 'Restaurante', notes: 'PRIORIDAD 2. Caye Caulker, Belize. The Split. Rating 4.5 (11 reseñas).' },
  { name: 'Tequila Sunrise Taco & Tequila Bar', phone: null, company: 'Tequila Sunrise Taco & Tequila Bar', project_type: 'Restaurante', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (10 reseñas).' },
  { name: 'Island Waffles', phone: '+5016099103', company: 'Island Waffles', project_type: 'Restaurante', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (10 reseñas). WA: https://wa.me/5016099103' },
  { name: 'Ceiba Yoga', phone: '+5016329860', company: 'Ceiba Yoga', project_type: 'Spa', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Avenida Mangle. Rating 5.0 (47 reseñas). WA: https://wa.me/5016329860' },
  { name: 'Namaste Yoga', phone: null, company: 'Namaste Yoga', project_type: 'Spa', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Pasero Street. Rating 5.0 (38 reseñas).' },
  { name: 'Healing Touch Day Spa', phone: '+5012060380', company: 'Healing Touch Day Spa', project_type: 'Spa', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.9 (27 reseñas). WA: https://wa.me/5012060380' },
  { name: 'SeaSide Beach Massage', phone: '+5016274428', company: 'SeaSide Beach Massage', project_type: 'Spa', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.9 (11 reseñas). WA: https://wa.me/5016274428' },
  { name: 'Caye Wellness', phone: '+5016213713', company: 'Caye Wellness', project_type: 'Spa', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (2 reseñas). WA: https://wa.me/5016213713' },
  { name: 'Kaj Expressions Caye Caulker', phone: '+5016134817', company: 'Kaj Expressions Caye Caulker', project_type: 'Tienda', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (33 reseñas). WA: https://wa.me/5016134817' },
  { name: 'Little Blue Gift Shop', phone: null, company: 'Little Blue Gift Shop', project_type: 'Tienda', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Hicaco Av. Rating 4.6 (23 reseñas).' },
  { name: 'Vintage Belize Gift Shop', phone: '+5016316709', company: 'Vintage Belize Gift Shop', project_type: 'Tienda', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (3 reseñas). WA: https://wa.me/5016316709' },
  { name: 'Celis Gift Shop', phone: '+5016691985', company: 'Celis Gift Shop', project_type: 'Tienda', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (3 reseñas). WA: https://wa.me/5016691985' },
  { name: 'Treasures @ The Split', phone: '+5016348089', company: 'Treasures @ The Split', project_type: 'Tienda', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (1 reseña). WA: https://wa.me/5016348089' },
  { name: 'Tsunami Adventures', phone: '+5016210529', company: 'Tsunami Adventures', project_type: 'Tours', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.4 (150 reseñas). WA: https://wa.me/5016210529' },
  { name: 'Blue Wave Divers', phone: '+5016363366', company: 'Blue Wave Divers', project_type: 'Tours', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.4 (146 reseñas). WA: https://wa.me/5016363366' },
  { name: 'Liberty Sailing Tours', phone: '+5016223848', company: 'Liberty Sailing Tours', project_type: 'Tours', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.5 (37 reseñas). WA: https://wa.me/5016223848' },
  { name: 'Caye Caulker Adventures with Vic', phone: '+5016156827', company: 'Caye Caulker Adventures with Vic', project_type: 'Tours', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (36 reseñas). WA: https://wa.me/5016156827' },
  { name: 'Gerald and Gerald Fishing and Snorkeling', phone: '+5016239843', company: 'Gerald and Gerald Fishing and Snorkeling', project_type: 'Tours', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (33 reseñas). WA: https://wa.me/5016239843' },
  { name: 'Barefoot Fisherman Expeditions', phone: '+5016341704', company: 'Barefoot Fisherman Expeditions', project_type: 'Tours', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.8 (20 reseñas). WA: https://wa.me/5016341704' },
  { name: 'Chasin Tail Fly Fishing', phone: '+5016151711', company: 'Chasin Tail Fly Fishing', project_type: 'Tours', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (15 reseñas). WA: https://wa.me/5016151711' },
  { name: 'Caye To Happiness', phone: '+5016361936', company: 'Caye To Happiness', project_type: 'Tours', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 4.6 (10 reseñas). WA: https://wa.me/5016361936' },
  { name: 'King Fish Tours', phone: '+19735362645', company: 'King Fish Tours', project_type: 'Tours', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (9 reseñas). WA: https://wa.me/19735362645' },
  { name: 'SailBelize', phone: '+5016134344', company: 'SailBelize', project_type: 'Tours', notes: 'PRIORIDAD 2. Caye Caulker, Belize. Rating 5.0 (3 reseñas). WA: https://wa.me/5016134344' },

  // ─── PRIORIDAD 1 ────────────────────────────────────────────────────────────
  { name: 'Celebration Destination Belize', phone: '+5016617804', company: 'Celebration Destination Belize', project_type: 'Eventos', notes: 'PRIORIDAD 1. Caye Caulker, Belize. Bodas y eventos. Sin rating. WA: https://wa.me/5016617804' },
  { name: 'RE/MAX Caye Caulker', phone: '+5016269818', company: 'RE/MAX Caye Caulker', project_type: 'Real Estate', notes: 'PRIORIDAD 1. Caye Caulker, Belize. Front Street. Rating 4.3 (6 reseñas). WA: https://wa.me/5016269818' },
  { name: 'Go Slow Golf Cart Rental', phone: '+5016294490', company: 'Go Slow Golf Cart Rental', project_type: 'Renta', notes: 'PRIORIDAD 1. Caye Caulker, Belize. Rating 4.1 (43 reseñas). WA: https://wa.me/5016294490' },
  { name: 'Eco Beach Rides', phone: '+5016212278', company: 'Eco Beach Rides', project_type: 'Renta', notes: 'PRIORIDAD 1. Caye Caulker, Belize. Rating 4.3 (21 reseñas). WA: https://wa.me/5016212278' },
  { name: 'J & Sons Xtreme Karts Golf Cart Rental', phone: '+5012260475', company: 'J & Sons Xtreme Karts Golf Cart Rental', project_type: 'Renta', notes: 'PRIORIDAD 1. Caye Caulker, Belize. Rating 3.7 (21 reseñas). WA: https://wa.me/5012260475' },
  { name: 'The Creamery Ice Cream Shop', phone: null, company: 'The Creamery Ice Cream Shop', project_type: 'Restaurante', notes: 'PRIORIDAD 1. Caye Caulker, Belize. Avenida Hicaco. Rating 4.3 (47 reseñas).' },
  { name: "Weezie's Patio Cafe & Bar", phone: null, company: "Weezie's Patio Cafe & Bar", project_type: 'Restaurante', notes: 'PRIORIDAD 1. Caye Caulker, Belize. Avenida Mangle. Rating 4.3 (46 reseñas).' },
  { name: 'La Fogata', phone: '+5016147492', company: 'La Fogata', project_type: 'Restaurante', notes: 'PRIORIDAD 1. Caye Caulker, Belize. Rating 4.3 (39 reseñas). WA: https://wa.me/5016147492' },
  { name: 'Da-Lis Pizza House', phone: '+5016228002', company: 'Da-Lis Pizza House', project_type: 'Restaurante', notes: 'PRIORIDAD 1. Caye Caulker, Belize. Rating 4.2 (17 reseñas). WA: https://wa.me/5016228002' },
  { name: 'Amigo Ice Cream', phone: null, company: 'Amigo Ice Cream', project_type: 'Restaurante', notes: 'PRIORIDAD 1. Caye Caulker, Belize. Main Street. Rating 4.2 (16 reseñas).' },
  { name: 'Laca Laca Toucan', phone: '+5012260219', company: 'Laca Laca Toucan', project_type: 'Tienda', notes: 'PRIORIDAD 1. Caye Caulker, Belize. Rating 2.8 (18 reseñas). WA: https://wa.me/5012260219' },
]

console.log(`Insertando ${leads.length} leads de Caye Caulker, Belize...`)

const rows = leads.map(l => ({
  name: l.name,
  phone: l.phone ?? null,
  company: l.company,
  project_type: l.project_type,
  notes: l.notes,
  source: 'other',
  status: 'new',
  email: null,
  budget_range: null,
}))

const { data, error } = await supabase.from('leads').insert(rows).select('id')

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
} else {
  console.log(`✓ ${data.length} leads insertados correctamente.`)
}
