-- ═══════════════════════════════════════════════════════════════════════
-- SEED DE DESARROLLO — productos de ejemplo para MarketplaceDR (Next.js)
-- Correr en Supabase → SQL Editor (el service role omite RLS).
-- user_id = NULL (productos de plataforma/demo). seller_name marcado como demo.
-- Para limpiarlos luego:  delete from public.products where seller_name = 'MarketplaceDR (demo)';
-- ═══════════════════════════════════════════════════════════════════════

insert into public.products
  (title, description, price, old_price, category, condition, location, image_url, seller_name, rating, reviews)
values
  ('iPhone 13 128GB', 'Excelente estado, incluye cargador y caja. Batería al 92%.',
   28500, 32000, 'electronics', 'used','Santo Domingo',
   'https://picsum.photos/seed/mrd-iphone/600/600', 'MarketplaceDR (demo)', 4.7, 23),

  ('Laptop Lenovo IdeaPad', 'Ryzen 5, 16GB RAM, 512GB SSD. Ideal para trabajo y estudio.',
   32900, null, 'electronics', 'new','Santiago',
   'https://picsum.photos/seed/mrd-laptop/600/600', 'MarketplaceDR (demo)', 4.9, 8),

  ('Honda Civic 2016', 'Full, aros, gomas nuevas. Papeles al día. Único dueño.',
   785000, 820000, 'vehicles', 'used','Santo Domingo Este',
   'https://picsum.photos/seed/mrd-civic/600/600', 'MarketplaceDR (demo)', 4.5, 12),

  ('Yamaha FZ 2.0', 'Motor 150cc, poco uso. Perfecta para la ciudad.',
   112000, null, 'vehicles', 'used','La Vega',
   'https://picsum.photos/seed/mrd-yamaha/600/600', 'MarketplaceDR (demo)', 4.3, 6),

  ('Tenis Nike Air Max', 'Talla 42, originales. Cómodos y en buen estado.',
   4200, 5500, 'fashion', 'used','Santiago',
   'https://picsum.photos/seed/mrd-nike/600/600', 'MarketplaceDR (demo)', 4.6, 31),

  ('Juego de sala 3-2-1', 'Mueble de sala tapizado, color gris. Entrega en el DN.',
   38000, null, 'home2', 'new','Distrito Nacional',
   'https://picsum.photos/seed/mrd-sala/600/600', 'MarketplaceDR (demo)', 4.4, 4),

  ('Bicicleta MTB Rin 29', 'Aluminio, 21 velocidades, frenos de disco.',
   15900, 18900, 'sports', 'new','Punta Cana',
   'https://picsum.photos/seed/mrd-bici/600/600', 'MarketplaceDR (demo)', 4.8, 17),

  ('Servicio de plomería', 'Instalaciones y reparaciones. Presupuesto sin compromiso.',
   1500, null, 'services', 'new','Santo Domingo',
   'https://picsum.photos/seed/mrd-plomeria/600/600', 'MarketplaceDR (demo)', 4.9, 42),

  ('Saco de café en grano 25lb', 'Café dominicano de altura, tostado medio.',
   3800, null, 'agro', 'new','Jarabacoa',
   'https://picsum.photos/seed/mrd-cafe/600/600', 'MarketplaceDR (demo)', 5.0, 9);
