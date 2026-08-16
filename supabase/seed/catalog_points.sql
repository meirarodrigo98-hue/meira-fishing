-- Gerado por scripts/export-points-sql.mjs — 104 pontos
-- Rode no Supabase SQL Editor depois da migration inicial.

insert into public.fishing_points (
  id, source, mode, name, area, lat, lng, point_type, confidence, species,
  access_note, coast, is_personal, is_protected, is_admin_point
) values
(
    'C001', 'catalog'::point_source, 'land'::point_mode,
    'Praça XV — mureta da orla', 'Centro / RJ', -22.9034, -43.1718,
    'Orla', 58, array['Robalo','Xaréu']::text[],
    'Calçada da Praça XV, mureta voltada pra baía', '{"exposure":"baixa","facing":95,"bottom":"misto","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C002', 'catalog'::point_source, 'land'::point_mode,
    'Pier Mauá — ponta do cais', 'Centro / RJ', -22.8962, -43.1812,
    'Pier', 56, array['Robalo','Xaréu']::text[],
    'Entrada do Pier Mauá; caminhe até a ponta do cais', '{"exposure":"baixa","facing":115,"bottom":"misto","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C016', 'catalog'::point_source, 'land'::point_mode,
    'Museu do Amanhã — mureta leste', 'Centro / RJ', -22.8941, -43.1796,
    'Orla', 55, array['Robalo','Xaréu']::text[],
    'Mureta leste do Museu do Amanhã, voltada à baía', '{"exposure":"baixa","facing":105,"bottom":"misto","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C017', 'catalog'::point_source, 'land'::point_mode,
    'Parque do Flamengo — ponta sul', 'Aterro / RJ', -22.9368, -43.1782,
    'Orla', 57, array['Robalo','Corvina']::text[],
    'Extremo sul do Aterro, quina antes de Botafogo', '{"exposure":"baixa","facing":100,"bottom":"areia","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C003', 'catalog'::point_source, 'land'::point_mode,
    'Marina da Glória — ponta do pier', 'Glória / RJ', -22.9186, -43.1705,
    'Pier', 65, array['Robalo','Xaréu']::text[],
    'Calçada da Marina; ponta do pier principal', '{"exposure":"baixa","facing":100,"bottom":"misto","bestTide":"both","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C004', 'catalog'::point_source, 'land'::point_mode,
    'MAM — mureta do Aterro', 'Aterro / RJ', -22.9225, -43.1759,
    'Orla', 60, array['Robalo','Corvina']::text[],
    'Mureta em frente ao MAM, calçada do Aterro', '{"exposure":"baixa","facing":95,"bottom":"areia","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C005', 'catalog'::point_source, 'land'::point_mode,
    'Monumento aos Pracinhas — mureta', 'Aterro / RJ', -22.9247, -43.1763,
    'Orla', 59, array['Robalo','Corvina']::text[],
    'Mureta ao lado do monumento, calçada do Flamengo', '{"exposure":"baixa","facing":95,"bottom":"areia","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C006', 'catalog'::point_source, 'land'::point_mode,
    'Flamengo — quina norte (posto 1)', 'Flamengo / RJ', -22.9288, -43.1738,
    'Praia', 61, array['Robalo','Corvina']::text[],
    'Quina norte da praia, calçada do Flamengo', '{"exposure":"baixa","facing":90,"bottom":"areia","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C019', 'catalog'::point_source, 'land'::point_mode,
    'Flamengo — meio da praia', 'Flamengo / RJ', -22.9322, -43.1752,
    'Praia', 58, array['Robalo','Corvina']::text[],
    'Calçada central da Praia do Flamengo', '{"exposure":"baixa","facing":92,"bottom":"areia","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C007', 'catalog'::point_source, 'land'::point_mode,
    'Flamengo — quina sul (Botafogo)', 'Flamengo / RJ', -22.9354, -43.1772,
    'Praia', 62, array['Robalo','Corvina']::text[],
    'Extremo sul da praia, quina voltada a Botafogo', '{"exposure":"baixa","facing":105,"bottom":"areia","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C008', 'catalog'::point_source, 'land'::point_mode,
    'Botafogo — enseada norte', 'Botafogo / RJ', -22.9412, -43.1792,
    'Orla', 64, array['Robalo','Xaréu']::text[],
    'Calçada da Enseada de Botafogo, trecho norte', '{"exposure":"baixa","facing":110,"bottom":"areia","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C020', 'catalog'::point_source, 'land'::point_mode,
    'Botafogo — fundo da enseada', 'Botafogo / RJ', -22.9468, -43.1825,
    'Orla', 63, array['Robalo','Xaréu']::text[],
    'Fundo da enseada, calçada em frente ao Pão de Açúcar', '{"exposure":"baixa","facing":115,"bottom":"areia","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C009', 'catalog'::point_source, 'land'::point_mode,
    'Botafogo — enseada sul (Urca)', 'Botafogo / RJ', -22.95, -43.1842,
    'Orla', 65, array['Robalo','Xaréu']::text[],
    'Calçada sul da enseada, quina antes da Urca', '{"exposure":"media","facing":120,"bottom":"areia","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C010', 'catalog'::point_source, 'land'::point_mode,
    'Urca — mureta principal', 'Urca / RJ', -22.9506, -43.1656,
    'Orla', 74, array['Robalo','Xaréu']::text[],
    'Mureta da Urca, calçada entre praia e morro', '{"exposure":"media","facing":80,"bottom":"rocha","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C022', 'catalog'::point_source, 'land'::point_mode,
    'Urca — clube naval (pedras)', 'Urca / RJ', -22.9518, -43.1648,
    'Pedra', 72, array['Robalo','Xaréu']::text[],
    'Pedras ao lado do clube naval, mureta da Urca', '{"exposure":"media","facing":85,"bottom":"rocha","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C011', 'catalog'::point_source, 'land'::point_mode,
    'Praia Vermelha — pedras leste', 'Urca / RJ', -22.9552, -43.1638,
    'Pedra', 70, array['Robalo','Corvina']::text[],
    'Extremo leste da Praia Vermelha, pedras na calçada', '{"exposure":"media","facing":85,"bottom":"rocha","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C023', 'catalog'::point_source, 'land'::point_mode,
    'Praia Vermelha — pedras oeste', 'Urca / RJ', -22.9558, -43.1652,
    'Pedra', 68, array['Robalo','Corvina']::text[],
    'Extremo oeste da praia, pedras perto da trilha do Pão de Açúcar', '{"exposure":"media","facing":75,"bottom":"rocha","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'C024', 'catalog'::point_source, 'land'::point_mode,
    'Forte do Leme — base leste', 'Leme / RJ', -22.9618, -43.1632,
    'Pedra', 78, array['Robalo','Xaréu']::text[],
    'Base do Forte do Leme, pedras acessíveis pela calçada', '{"exposure":"alta","facing":130,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C025', 'catalog'::point_source, 'land'::point_mode,
    'Costão do Leme — pedra norte', 'Leme / RJ', -22.9632, -43.1612,
    'Costão', 81, array['Robalo','Xaréu']::text[],
    'Costão norte do Leme, pedras na rebentação', '{"exposure":"alta","facing":140,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C012', 'catalog'::point_source, 'land'::point_mode,
    'Costão do Leme — pedra central', 'Leme / RJ', -22.9636, -43.1617,
    'Costão', 82, array['Robalo','Xaréu']::text[],
    'Pedra central do costão, acesso pela calçada do Leme', '{"exposure":"alta","facing":135,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C026', 'catalog'::point_source, 'land'::point_mode,
    'Costão do Leme — pedra sul', 'Leme / RJ', -22.9648, -43.1625,
    'Costão', 79, array['Robalo','Xaréu']::text[],
    'Costão sul, quina voltada a Copacabana', '{"exposure":"alta","facing":150,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C027', 'catalog'::point_source, 'land'::point_mode,
    'Copacabana — Posto 2 (quina)', 'Copacabana / RJ', -22.9712, -43.1825,
    'Orla', 62, array['Robalo','Corvina']::text[],
    'Quina do Posto 2, calçada de Copacabana', '{"exposure":"media","facing":155,"bottom":"areia","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C028', 'catalog'::point_source, 'land'::point_mode,
    'Copacabana — Posto 3', 'Copacabana / RJ', -22.9768, -43.1858,
    'Orla', 60, array['Robalo','Corvina']::text[],
    'Calçada do Posto 3', '{"exposure":"media","facing":158,"bottom":"areia","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C029', 'catalog'::point_source, 'land'::point_mode,
    'Copacabana — Posto 4', 'Copacabana / RJ', -22.9815, -43.1882,
    'Orla', 61, array['Robalo','Corvina']::text[],
    'Calçada do Posto 4', '{"exposure":"media","facing":160,"bottom":"areia","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C030', 'catalog'::point_source, 'land'::point_mode,
    'Copacabana — Posto 5', 'Copacabana / RJ', -22.9858, -43.19,
    'Orla', 63, array['Robalo','Xaréu']::text[],
    'Calçada do Posto 5, antes do Forte', '{"exposure":"alta","facing":162,"bottom":"misto","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C031', 'catalog'::point_source, 'land'::point_mode,
    'Forte Copacabana — pedra oeste', 'Copacabana / RJ', -22.9875, -43.1925,
    'Pedra', 76, array['Robalo','Xaréu']::text[],
    'Pedras oeste do Forte, calçada do Posto 6', '{"exposure":"alta","facing":165,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C013', 'catalog'::point_source, 'land'::point_mode,
    'Forte Copacabana — pedra central', 'Copacabana / RJ', -22.9881, -43.1912,
    'Pedra', 78, array['Robalo','Xaréu']::text[],
    'Pedra central em frente ao Forte, Posto 6', '{"exposure":"alta","facing":160,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C032', 'catalog'::point_source, 'land'::point_mode,
    'Forte Copacabana — pedra leste (Arpoador)', 'Copacabana / RJ', -22.9888, -43.19,
    'Pedra', 77, array['Robalo','Xaréu']::text[],
    'Pedras leste do Forte, caminho pro Arpoador', '{"exposure":"alta","facing":175,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C033', 'catalog'::point_source, 'land'::point_mode,
    'Posto 6 — mureta do Forte', 'Copacabana / RJ', -22.987, -43.1908,
    'Pedra', 72, array['Robalo','Xaréu']::text[],
    'Mureta do calçadão do Posto 6', '{"exposure":"alta","facing":168,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C034', 'catalog'::point_source, 'land'::point_mode,
    'Arpoador — pedra norte (Forte)', 'Ipanema / RJ', -22.9885, -43.1915,
    'Costão', 84, array['Anchova','Xaréu']::text[],
    'Pedra norte do Arpoador, lado Forte Copacabana', '{"exposure":"alta","facing":175,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C014', 'catalog'::point_source, 'land'::point_mode,
    'Arpoador — pedra central', 'Ipanema / RJ', -22.99043, -43.19099,
    'Costão', 86, array['Anchova','Xaréu']::text[],
    'Pedra central do Arpoador, mirante principal', '{"exposure":"alta","facing":180,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C035', 'catalog'::point_source, 'land'::point_mode,
    'Arpoador — pedra sul (Ipanema)', 'Ipanema / RJ', -22.9918, -43.1902,
    'Costão', 83, array['Anchova','Xaréu']::text[],
    'Pedra sul do Arpoador, quina pra Ipanema', '{"exposure":"alta","facing":185,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C036', 'catalog'::point_source, 'land'::point_mode,
    'Ipanema — Posto 7', 'Ipanema / RJ', -22.9835, -43.2045,
    'Orla', 64, array['Robalo','Corvina']::text[],
    'Calçada do Posto 7, Ipanema', '{"exposure":"media","facing":170,"bottom":"areia","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C037', 'catalog'::point_source, 'land'::point_mode,
    'Ipanema — Posto 8', 'Ipanema / RJ', -22.9862, -43.2098,
    'Orla', 63, array['Robalo','Corvina']::text[],
    'Calçada do Posto 8', '{"exposure":"media","facing":172,"bottom":"areia","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C038', 'catalog'::point_source, 'land'::point_mode,
    'Ipanema — Posto 9 (canal)', 'Ipanema / RJ', -22.9888, -43.2142,
    'Orla', 66, array['Robalo','Corvina']::text[],
    'Posto 9, quina antes do canal do Jardim de Alah', '{"exposure":"media","facing":175,"bottom":"misto","bestTide":"both","water":"canal"}'::jsonb,
    false, false, false
  ),
(
    'C040', 'catalog'::point_source, 'land'::point_mode,
    'Jardim de Alah — margem Ipanema', 'Ipanema / RJ', -22.9855, -43.2145,
    'Canal', 71, array['Robalo','Corvina']::text[],
    'Margem Ipanema do canal, calçada do Jardim de Alah', '{"exposure":"media","facing":175,"bottom":"misto","bestTide":"both","water":"canal"}'::jsonb,
    false, false, false
  ),
(
    'C015', 'catalog'::point_source, 'land'::point_mode,
    'Jardim de Alah — boca do canal', 'Leblon / RJ', -22.9848, -43.2148,
    'Canal', 73, array['Robalo','Corvina']::text[],
    'Boca do canal na praia, entre Ipanema e Leblon', '{"exposure":"media","facing":170,"bottom":"misto","bestTide":"both","water":"canal"}'::jsonb,
    false, false, false
  ),
(
    'C039', 'catalog'::point_source, 'land'::point_mode,
    'Jardim de Alah — margem Leblon', 'Leblon / RJ', -22.9842, -43.2162,
    'Canal', 70, array['Robalo','Corvina']::text[],
    'Margem Leblon do canal, calçada do Jardim de Alah', '{"exposure":"media","facing":165,"bottom":"misto","bestTide":"both","water":"canal"}'::jsonb,
    false, false, false
  ),
(
    'C041', 'catalog'::point_source, 'land'::point_mode,
    'Leblon — ponta (mirante)', 'Leblon / RJ', -22.9912, -43.2235,
    'Costão', 75, array['Anchova','Robalo']::text[],
    'Ponta do Leblon, mirante no final da praia', '{"exposure":"alta","facing":190,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C042', 'catalog'::point_source, 'land'::point_mode,
    'Leblon — Posto 10', 'Leblon / RJ', -22.9875, -43.2188,
    'Orla', 62, array['Robalo','Corvina']::text[],
    'Calçada do Posto 10', '{"exposure":"media","facing":178,"bottom":"areia","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C043', 'catalog'::point_source, 'land'::point_mode,
    'Leblon — Posto 11', 'Leblon / RJ', -22.9905, -43.222,
    'Orla', 61, array['Robalo','Corvina']::text[],
    'Calçada do Posto 11', '{"exposure":"media","facing":182,"bottom":"areia","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C044', 'catalog'::point_source, 'land'::point_mode,
    'Leblon — Posto 12 (São Conrado)', 'Leblon / RJ', -22.9938, -43.2265,
    'Orla', 64, array['Robalo','Corvina']::text[],
    'Posto 12, quina antes de São Conrado', '{"exposure":"alta","facing":195,"bottom":"misto","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C045', 'catalog'::point_source, 'land'::point_mode,
    'Pedra do Diabo — base', 'São Conrado / RJ', -22.9978, -43.2512,
    'Costão', 76, array['Anchova','Xaréu']::text[],
    'Trilha da Pedra do Diabo; base com pedras na rebentação', '{"exposure":"alta","facing":200,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C046', 'catalog'::point_source, 'land'::point_mode,
    'São Conrado — pedras sul da praia', 'São Conrado / RJ', -23.0085, -43.2568,
    'Pedra', 70, array['Robalo','Xaréu']::text[],
    'Extremo sul da Praia de São Conrado, pedras', '{"exposure":"alta","facing":210,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C047', 'catalog'::point_source, 'land'::point_mode,
    'São Conrado — costão leste', 'São Conrado / RJ', -23.0062, -43.2535,
    'Costão', 68, array['Robalo','Xaréu']::text[],
    'Costão leste da praia, pedras acessíveis', '{"exposure":"alta","facing":195,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C056', 'catalog'::point_source, 'land'::point_mode,
    'Joatinga — mirante (pedras)', 'Joatinga / RJ', -23.0125, -43.2885,
    'Costão', 72, array['Robalo','Xaréu']::text[],
    'Trilha do mirante de Joatinga; pedras na base', '{"exposure":"alta","facing":130,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C057', 'catalog'::point_source, 'land'::point_mode,
    'Joatinga — praia (pedras oeste)', 'Joatinga / RJ', -23.0142, -43.292,
    'Pedra', 70, array['Robalo','Xaréu']::text[],
    'Extremo oeste da Praia da Joatinga', '{"exposure":"alta","facing":125,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C049', 'catalog'::point_source, 'land'::point_mode,
    'Barra — boca do canal Tijucas', 'Barra da Tijuca / RJ', -23.0065, -43.3045,
    'Canal', 68, array['Robalo','Xaréu']::text[],
    'Boca do canal da Barra, calçada da Av. Lucio Costa', '{"exposure":"media","facing":120,"bottom":"misto","bestTide":"both","water":"canal"}'::jsonb,
    false, false, false
  ),
(
    'C050', 'catalog'::point_source, 'land'::point_mode,
    'Barra — Posto 1 (pepê)', 'Barra da Tijuca / RJ', -23.0088, -43.3085,
    'Orla', 60, array['Robalo','Corvina']::text[],
    'Calçada do Posto 1, Barra da Tijuca', '{"exposure":"media","facing":115,"bottom":"areia","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C051', 'catalog'::point_source, 'land'::point_mode,
    'Barra — Posto 2', 'Barra da Tijuca / RJ', -23.0115, -43.3135,
    'Orla', 59, array['Robalo','Corvina']::text[],
    'Calçada do Posto 2', '{"exposure":"media","facing":118,"bottom":"areia","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C052', 'catalog'::point_source, 'land'::point_mode,
    'Barra — Posto 3', 'Barra da Tijuca / RJ', -23.0148, -43.3195,
    'Orla', 58, array['Robalo','Corvina']::text[],
    'Calçada do Posto 3', '{"exposure":"media","facing":120,"bottom":"areia","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C053', 'catalog'::point_source, 'land'::point_mode,
    'Barra — Posto 4 (pier)', 'Barra da Tijuca / RJ', -23.0175, -43.3255,
    'Pier', 64, array['Robalo','Xaréu']::text[],
    'Posto 4, pier e calçada da Barra', '{"exposure":"media","facing":122,"bottom":"misto","bestTide":"both","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C054', 'catalog'::point_source, 'land'::point_mode,
    'Barra — quebra-mar', 'Barra da Tijuca / RJ', -23.0198, -43.3298,
    'Pedra', 66, array['Robalo','Xaréu']::text[],
    'Quebra-mar da Barra, pedras no extremo da praia', '{"exposure":"alta","facing":125,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C055', 'catalog'::point_source, 'land'::point_mode,
    'Reserva — pedras (trilha)', 'Barra da Tijuca / RJ', -23.0285, -43.3585,
    'Pedra', 65, array['Robalo','Xaréu']::text[],
    'Trilha da Reserva Ecológica; pedras na praia', '{"exposure":"alta","facing":130,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C058', 'catalog'::point_source, 'land'::point_mode,
    'Recreio — Posto 9', 'Recreio / RJ', -23.0245, -43.4485,
    'Orla', 57, array['Robalo','Corvina']::text[],
    'Calçada do Posto 9, Recreio', '{"exposure":"media","facing":105,"bottom":"areia","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C059', 'catalog'::point_source, 'land'::point_mode,
    'Recreio — Posto 10', 'Recreio / RJ', -23.0278, -43.4585,
    'Orla', 56, array['Robalo','Corvina']::text[],
    'Calçada do Posto 10', '{"exposure":"media","facing":108,"bottom":"areia","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C060', 'catalog'::point_source, 'land'::point_mode,
    'Recreio — pedras Bandeirantes', 'Recreio / RJ', -23.0305, -43.4685,
    'Pedra', 62, array['Robalo','Xaréu']::text[],
    'Pedras na Av. Sernambetiba, trecho Bandeirantes', '{"exposure":"media","facing":110,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C061', 'catalog'::point_source, 'land'::point_mode,
    'Macumba — pedras', 'Recreio / RJ', -23.0365, -43.4825,
    'Pedra', 64, array['Robalo','Xaréu']::text[],
    'Pedras na praia de Macumba, estacionamento na Sernambetiba', '{"exposure":"alta","facing":115,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C062', 'catalog'::point_source, 'land'::point_mode,
    'Prainha — costão', 'Prainha / RJ', -23.0452, -43.5125,
    'Costão', 70, array['Robalo','Xaréu']::text[],
    'Costão da Prainha, pedras no acesso sul', '{"exposure":"alta","facing":120,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'C063', 'catalog'::point_source, 'land'::point_mode,
    'Grumari — pedras norte', 'Grumari / RJ', -23.0485, -43.5185,
    'Pedra', 68, array['Robalo','Xaréu']::text[],
    'Extremo norte da Praia de Grumari, pedras', '{"exposure":"alta","facing":125,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'L001', 'catalog'::point_source, 'land'::point_mode,
    'Lagoa — Corte do Cantagalo', 'Lagoa / RJ', -22.9738, -43.2051,
    'Lagoa', 66, array['Tilápia','Traíra']::text[],
    'Corte do Cantagalo, calçada da Lagoa', '{"exposure":"baixa","facing":0,"bottom":"vegetacao","bestTide":"any","water":"lagoon"}'::jsonb,
    false, false, false
  ),
(
    'L002', 'catalog'::point_source, 'land'::point_mode,
    'Lagoa — Parque dos Patins', 'Lagoa / RJ', -22.9739, -43.2187,
    'Lagoa', 67, array['Tilápia','Traíra']::text[],
    'Parque dos Patins, margem da Lagoa', '{"exposure":"baixa","facing":0,"bottom":"vegetacao","bestTide":"any","water":"lagoon"}'::jsonb,
    false, false, false
  ),
(
    'L003', 'catalog'::point_source, 'land'::point_mode,
    'Lagoa — Fonte da Saudade', 'Lagoa / RJ', -22.9646, -43.2036,
    'Lagoa', 68, array['Tilápia','Traíra']::text[],
    'Fonte da Saudade, calçada sombreada', '{"exposure":"baixa","facing":0,"bottom":"vegetacao","bestTide":"any","water":"lagoon"}'::jsonb,
    false, false, false
  ),
(
    'L004', 'catalog'::point_source, 'land'::point_mode,
    'Lagoa — Parque da Catacumba', 'Lagoa / RJ', -22.9686, -43.1947,
    'Lagoa', 67, array['Tilápia','Traíra']::text[],
    'Parque da Catacumba, margem oeste', '{"exposure":"baixa","facing":0,"bottom":"vegetacao","bestTide":"any","water":"lagoon"}'::jsonb,
    false, false, false
  ),
(
    'L005', 'catalog'::point_source, 'land'::point_mode,
    'Lagoa — Jardim Botânico', 'Lagoa / RJ', -22.9667, -43.2188,
    'Lagoa', 66, array['Tilápia','Traíra']::text[],
    'Margem em frente ao Jardim Botânico', '{"exposure":"baixa","facing":0,"bottom":"vegetacao","bestTide":"any","water":"lagoon"}'::jsonb,
    false, false, false
  ),
(
    'L006', 'catalog'::point_source, 'land'::point_mode,
    'Lagoa — Piraquê', 'Lagoa / RJ', -22.9727, -43.2299,
    'Lagoa', 64, array['Tilápia','Traíra']::text[],
    'Quina do Piraquê, calçada da Lagoa', '{"exposure":"baixa","facing":0,"bottom":"vegetacao","bestTide":"any","water":"lagoon"}'::jsonb,
    false, false, false
  ),
(
    'L007', 'catalog'::point_source, 'land'::point_mode,
    'Lagoa — Ponte das Garças', 'Lagoa / RJ', -22.9712, -43.2125,
    'Lagoa', 69, array['Tilápia','Traíra']::text[],
    'Base da Ponte das Garças, margem da Lagoa', '{"exposure":"baixa","facing":0,"bottom":"vegetacao","bestTide":"any","water":"lagoon"}'::jsonb,
    false, false, false
  ),
(
    'L008', 'catalog'::point_source, 'land'::point_mode,
    'Lagoa — Ponte Jardim Botânico', 'Lagoa / RJ', -22.9675, -43.2175,
    'Lagoa', 68, array['Tilápia','Traíra']::text[],
    'Base da ponte do Jardim Botânico', '{"exposure":"baixa","facing":0,"bottom":"vegetacao","bestTide":"any","water":"lagoon"}'::jsonb,
    false, false, false
  ),
(
    'L009', 'catalog'::point_source, 'land'::point_mode,
    'Lagoa — Corte Joá', 'Lagoa / RJ', -22.9875, -43.2285,
    'Lagoa', 65, array['Tilápia','Traíra']::text[],
    'Corte Joá, margem sul da Lagoa', '{"exposure":"baixa","facing":0,"bottom":"vegetacao","bestTide":"any","water":"lagoon"}'::jsonb,
    false, false, false
  ),
(
    'L010', 'catalog'::point_source, 'land'::point_mode,
    'Lagoa — Corte Timóteo da Costa', 'Lagoa / RJ', -22.9815, -43.2315,
    'Lagoa', 64, array['Tilápia','Traíra']::text[],
    'Corte Timóteo da Costa, calçada da Lagoa', '{"exposure":"baixa","facing":0,"bottom":"vegetacao","bestTide":"any","water":"lagoon"}'::jsonb,
    false, false, false
  ),
(
    'L011', 'catalog'::point_source, 'land'::point_mode,
    'Lagoa — quina leste (Caguaçu)', 'Lagoa / RJ', -22.9755, -43.1925,
    'Lagoa', 63, array['Tilápia','Traíra']::text[],
    'Quina leste da Lagoa, trecho Caguaçu', '{"exposure":"baixa","facing":0,"bottom":"vegetacao","bestTide":"any","water":"lagoon"}'::jsonb,
    false, false, false
  ),
(
    'L012', 'catalog'::point_source, 'land'::point_mode,
    'Lagoa — Clube Naval', 'Lagoa / RJ', -22.9705, -43.2078,
    'Lagoa', 65, array['Tilápia','Traíra']::text[],
    'Margem em frente ao Clube Naval', '{"exposure":"baixa","facing":0,"bottom":"vegetacao","bestTide":"any","water":"lagoon"}'::jsonb,
    false, false, false
  ),
(
    'N001', 'catalog'::point_source, 'land'::point_mode,
    'Charitas — pier', 'Charitas / Niterói', -22.9342, -43.1085,
    'Pier', 70, array['Robalo','Xaréu']::text[],
    'Pier de Charitas, ponta do cais', '{"exposure":"baixa","facing":290,"bottom":"misto","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'N002', 'catalog'::point_source, 'land'::point_mode,
    'Charitas — pedras sul', 'Charitas / Niterói', -22.9365, -43.1068,
    'Pedra', 68, array['Robalo','Xaréu']::text[],
    'Pedras sul de Charitas, orla da praia', '{"exposure":"media","facing":285,"bottom":"rocha","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'N003', 'catalog'::point_source, 'land'::point_mode,
    'Icaraí — orla central', 'Icaraí / Niterói', -22.9035, -43.1082,
    'Orla', 62, array['Robalo','Corvina']::text[],
    'Calçada central da Praia de Icaraí', '{"exposure":"baixa","facing":280,"bottom":"areia","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'N004', 'catalog'::point_source, 'land'::point_mode,
    'Icaraí — ponta (Forte)', 'Icaraí / Niterói', -22.8998, -43.1045,
    'Pedra', 66, array['Robalo','Xaréu']::text[],
    'Ponta leste de Icaraí, pedras perto do Forte', '{"exposure":"media","facing":275,"bottom":"rocha","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'N005', 'catalog'::point_source, 'land'::point_mode,
    'São Francisco — orla', 'São Francisco / Niterói', -22.9265, -43.0925,
    'Orla', 60, array['Robalo','Corvina']::text[],
    'Calçada da orla de São Francisco', '{"exposure":"baixa","facing":270,"bottom":"areia","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'N006', 'catalog'::point_source, 'land'::point_mode,
    'Jurujuba — pier do peixe', 'Jurujuba / Niterói', -22.9135, -43.0885,
    'Pier', 72, array['Robalo','Xaréu']::text[],
    'Pier de Jurujuba, área do peixe', '{"exposure":"baixa","facing":265,"bottom":"misto","bestTide":"both","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'N007', 'catalog'::point_source, 'land'::point_mode,
    'Jurujuba — costão', 'Jurujuba / Niterói', -22.9158, -43.0865,
    'Costão', 74, array['Robalo','Xaréu']::text[],
    'Costão de Jurujuba, pedras na rebentação', '{"exposure":"media","facing":260,"bottom":"rocha","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'N008', 'catalog'::point_source, 'land'::point_mode,
    'Itaipu — canal (boca)', 'Itaipu / Niterói', -22.9655, -43.0455,
    'Canal', 67, array['Robalo','Xaréu']::text[],
    'Boca do canal de Itaipu, calçada da praia', '{"exposure":"media","facing":250,"bottom":"misto","bestTide":"both","water":"canal"}'::jsonb,
    false, false, false
  ),
(
    'N009', 'catalog'::point_source, 'land'::point_mode,
    'Itaipu — praia (pedras)', 'Itaipu / Niterói', -22.9685, -43.0425,
    'Pedra', 65, array['Robalo','Xaréu']::text[],
    'Pedras no extremo da Praia de Itaipu', '{"exposure":"media","facing":255,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'N010', 'catalog'::point_source, 'land'::point_mode,
    'Camboinhas — ponta da praia', 'Camboinhas / Niterói', -22.9585, -43.0285,
    'Pedra', 68, array['Robalo','Xaréu']::text[],
    'Ponta da Praia de Camboinhas', '{"exposure":"media","facing":245,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'N011', 'catalog'::point_source, 'land'::point_mode,
    'Piratininga — canal', 'Piratininga / Niterói', -22.9745, -43.0155,
    'Canal', 66, array['Robalo','Xaréu']::text[],
    'Canal entre Piratininga e Camboinhas', '{"exposure":"media","facing":240,"bottom":"misto","bestTide":"both","water":"canal"}'::jsonb,
    false, false, false
  ),
(
    'N012', 'catalog'::point_source, 'land'::point_mode,
    'Piratininga — costão leste', 'Piratininga / Niterói', -22.9785, -43.0085,
    'Costão', 70, array['Robalo','Xaréu']::text[],
    'Costão leste de Piratininga, pedras', '{"exposure":"alta","facing":235,"bottom":"rocha","bestTide":"rising","water":"ocean"}'::jsonb,
    false, false, false
  ),
(
    'N013', 'catalog'::point_source, 'land'::point_mode,
    'Niterói — cais turístico', 'Centro / Niterói', -22.8945, -43.1205,
    'Pier', 58, array['Robalo','Xaréu']::text[],
    'Cais turístico de Niterói, ponta do pier', '{"exposure":"baixa","facing":285,"bottom":"misto","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'N014', 'catalog'::point_source, 'land'::point_mode,
    'Santa Rosa — mureta', 'Niterói / RJ', -22.9185, -43.0955,
    'Orla', 59, array['Robalo','Corvina']::text[],
    'Mureta da orla de Santa Rosa', '{"exposure":"baixa","facing":275,"bottom":"areia","bestTide":"rising","water":"bay"}'::jsonb,
    false, false, false
  ),
(
    'B001', 'catalog'::point_source, 'boat'::point_mode,
    'Entorno das Ilhas Cagarras', 'Mar de Ipanema / RJ', -23.03028, -43.20028,
    'Ilhas', 78, array['Xaréu','Olho-de-boi']::text[],
    '', null,
    false, false, false
  ),
(
    'B002', 'catalog'::point_source, 'boat'::point_mode,
    'Ilhas Tijucas', 'Barra da Tijuca / RJ', -23.03083, -43.29222,
    'Ilhas', 84, array['Garoupa','Xaréu']::text[],
    '', null,
    false, false, false
  ),
(
    'B003', 'catalog'::point_source, 'boat'::point_mode,
    'Ilha Rasa — entorno', 'Ao largo da Barra / RJ', -23.06333, -43.14583,
    'Ilha', 77, array['Anchova','Olho-de-boi']::text[],
    '', null,
    false, false, false
  ),
(
    'B004', 'catalog'::point_source, 'boat'::point_mode,
    'Boca da Barra — referência', 'Entrada da Baía / RJ', -22.9558, -43.1298,
    'Canal', 62, array['Xaréu','Robalo']::text[],
    '', null,
    false, false, false
  ),
(
    'B005', 'catalog'::point_source, 'boat'::point_mode,
    'Mar aberto — sul de Cagarras', 'Costa do Rio / RJ', -23.075, -43.208,
    'Mar aberto', 55, array['Anchova']::text[],
    '', null,
    false, false, false
  ),
(
    'B006', 'catalog'::point_source, 'boat'::point_mode,
    'Setor externo das Tijucas', 'Barra da Tijuca / RJ', -23.053, -43.315,
    'Mar aberto', 58, array['Xaréu','Garoupa']::text[],
    '', null,
    false, false, false
  ),
(
    'B007', 'catalog'::point_source, 'boat'::point_mode,
    'Canal central da Guanabara', 'Baía de Guanabara / RJ', -22.909, -43.1535,
    'Canal', 57, array['Robalo','Xaréu']::text[],
    '', null,
    false, false, false
  ),
(
    'B008', 'catalog'::point_source, 'boat'::point_mode,
    'Setor da Ilha Fiscal', 'Baía de Guanabara / RJ', -22.8978, -43.1704,
    'Canal', 56, array['Robalo','Xaréu']::text[],
    '', null,
    false, false, false
  ),
(
    'O001', 'catalog'::point_source, 'boat'::point_mode,
    'Quebra offshore 18 → 32 m', 'Ao largo do Leme / RJ', -22.9895, -43.115,
    'Offshore', 72, array['Anchova','Xaréu']::text[],
    '', null,
    false, false, false
  ),
(
    'O002', 'catalog'::point_source, 'boat'::point_mode,
    'Cabeço submarino oeste', 'Ao largo de Copacabana / RJ', -23.004, -43.145,
    'Offshore', 74, array['Xaréu','Olho-de-boi']::text[],
    '', null,
    false, false, false
  ),
(
    'O003', 'catalog'::point_source, 'boat'::point_mode,
    'Borda externa das Cagarras', 'Costa do Rio / RJ', -23.054, -43.19,
    'Offshore', 76, array['Anchova','Xaréu']::text[],
    '', null,
    false, false, false
  ),
(
    'O004', 'catalog'::point_source, 'boat'::point_mode,
    'Canal profundo sul', 'Sul das Cagarras / RJ', -23.081, -43.225,
    'Offshore', 71, array['Olho-de-boi','Anchova']::text[],
    '', null,
    false, false, false
  ),
(
    'O005', 'catalog'::point_source, 'boat'::point_mode,
    'Quebra 22 → 41 m', 'Ao largo do Arpoador / RJ', -23.026, -43.172,
    'Offshore', 77, array['Anchova','Xaréu']::text[],
    '', null,
    false, false, false
  ),
(
    'O006', 'catalog'::point_source, 'boat'::point_mode,
    'Alto fundo costeiro', 'Leste das Cagarras / RJ', -23.03, -43.145,
    'Offshore', 73, array['Xaréu','Olho-de-boi']::text[],
    '', null,
    false, false, false
  ),
(
    'O007', 'catalog'::point_source, 'boat'::point_mode,
    'Borda de canal norte', 'Entrada oceânica da Guanabara / RJ', -22.945, -43.085,
    'Offshore', 69, array['Xaréu','Robalo']::text[],
    '', null,
    false, false, false
  ),
(
    'O008', 'catalog'::point_source, 'boat'::point_mode,
    'Laje isolada offshore', 'Entre Cagarras e Tijucas / RJ', -23.039, -43.245,
    'Offshore', 75, array['Garoupa','Xaréu']::text[],
    '', null,
    false, false, false
  ),
(
    'O009', 'catalog'::point_source, 'boat'::point_mode,
    'Borda externa das Tijucas', 'Ao largo da Barra / RJ', -23.067, -43.333,
    'Offshore', 79, array['Garoupa','Xaréu']::text[],
    '', null,
    false, false, false
  ),
(
    'O010', 'catalog'::point_source, 'boat'::point_mode,
    'Quebra 30 → 52 m', 'Sul das Tijucas / RJ', -23.096, -43.305,
    'Offshore', 78, array['Olho-de-boi','Anchova']::text[],
    '', null,
    false, false, false
  )
on conflict (id) do update set
  source = excluded.source,
  mode = excluded.mode,
  name = excluded.name,
  area = excluded.area,
  lat = excluded.lat,
  lng = excluded.lng,
  point_type = excluded.point_type,
  confidence = excluded.confidence,
  species = excluded.species,
  access_note = excluded.access_note,
  coast = excluded.coast,
  is_personal = excluded.is_personal,
  is_protected = excluded.is_protected,
  is_admin_point = excluded.is_admin_point,
  updated_at = now();
