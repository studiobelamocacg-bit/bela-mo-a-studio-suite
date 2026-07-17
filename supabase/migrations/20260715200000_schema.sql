-- Habilitar pgcrypto para criptografia se não estiver habilitado
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =========================================================================
-- 1. PROFISSIONAIS (public.professionals)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  specialties TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#0D9488',
  days_worked INT[] DEFAULT '{1,2,3,4,5,6}', -- 1=Segunda, 6=Sábado
  work_hours_start TEXT DEFAULT '09:00',
  work_hours_end TEXT DEFAULT '18:00',
  commission_percent NUMERIC(5,2) DEFAULT 0.00,
  commission_fixed NUMERIC(10,2) DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professionals TO authenticated;
GRANT SELECT ON public.professionals TO anon;
GRANT ALL ON public.professionals TO service_role;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on active professionals" 
  ON public.professionals FOR SELECT USING (is_active = true);

CREATE POLICY "Allow authenticated read all professionals" 
  ON public.professionals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admins manage professionals" 
  ON public.professionals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 2. SERVIÇOS (public.services)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration INT NOT NULL, -- em minutos
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  color TEXT DEFAULT '#AEE9E1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on active services" 
  ON public.services FOR SELECT USING (is_active = true);

CREATE POLICY "Allow authenticated read all services" 
  ON public.services FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admins manage services" 
  ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 3. VÍNCULO PROFISSIONAL E SERVIÇO (public.professional_services)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.professional_services (
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, service_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_services TO authenticated;
GRANT SELECT ON public.professional_services TO anon;
GRANT ALL ON public.professional_services TO service_role;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read professional_services" 
  ON public.professional_services FOR SELECT USING (true);

CREATE POLICY "Allow admins manage professional_services" 
  ON public.professional_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 4. CLIENTES (public.clients)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  email TEXT,
  birth_date DATE,
  cpf TEXT,
  preferred_professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  first_service_date DATE,
  status TEXT NOT NULL DEFAULT 'Ativa', -- 'Ativa' ou 'Inativa'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT INSERT ON public.clients TO anon; -- Permitir agendamento público cadastrar cliente
GRANT SELECT ON public.clients TO anon;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts on clients" 
  ON public.clients FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on clients for matching" 
  ON public.clients FOR SELECT USING (true);

CREATE POLICY "Allow authenticated manage clients" 
  ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 5. ANAMNESE DA CLIENTE (public.client_anamnesis)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.client_anamnesis (
  client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  alergias TEXT,
  gestante BOOLEAN NOT NULL DEFAULT false,
  lactante BOOLEAN NOT NULL DEFAULT false,
  medicamentos TEXT,
  problemas_oculares TEXT,
  lentes_contato BOOLEAN NOT NULL DEFAULT false,
  doencas TEXT,
  contraindicacoes TEXT,
  questionario_cilios JSONB DEFAULT '{}'::jsonb,
  signature TEXT, -- Imagem base64 da assinatura digital
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_anamnesis TO authenticated;
GRANT ALL ON public.client_anamnesis TO service_role;
ALTER TABLE public.client_anamnesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated manage anamnesis" 
  ON public.client_anamnesis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 6. AUTORIZAÇÃO DE USO DE IMAGEM (public.client_consent)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.client_consent (
  client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  text_content TEXT,
  signature TEXT, -- Imagem base64
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_consent TO authenticated;
GRANT ALL ON public.client_consent TO service_role;
ALTER TABLE public.client_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated manage consent" 
  ON public.client_consent FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 7. FOTOS DE ATENDIMENTOS (public.client_photos)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.client_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID,
  url TEXT NOT NULL, -- url ou base64
  category TEXT NOT NULL, -- 'Antes', 'Depois', 'Mapping', 'Retencao', 'Outras'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_photos TO authenticated;
GRANT ALL ON public.client_photos TO service_role;
ALTER TABLE public.client_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated manage photos" 
  ON public.client_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 8. MAPPING DE CÍLIOS (public.client_mappings)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.client_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID,
  photo_url TEXT,
  curvaturas TEXT,
  espessuras TEXT,
  mapping_type TEXT,
  marca_fios TEXT,
  marca_cola TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_mappings TO authenticated;
GRANT ALL ON public.client_mappings TO service_role;
ALTER TABLE public.client_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated manage mappings" 
  ON public.client_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 9. AGENDAMENTOS / ATENDIMENTOS (public.appointments)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendado', -- 'agendado', 'confirmado', 'concluido', 'cancelado', 'falta'
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  commission_paid NUMERIC(10,2) DEFAULT 0.00,
  payment_method TEXT, -- 'PIX', 'Dinheiro', 'Cartao_Credito', 'Cartao_Debito', 'Transferencia'
  duration INT NOT NULL, -- em minutos
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.appointments TO anon; -- agendamento público lê e cria
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write on appointments" 
  ON public.appointments FOR SELECT USING (true);

CREATE POLICY "Allow public inserts on appointments" 
  ON public.appointments FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public updates on appointments" 
  ON public.appointments FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated manage appointments" 
  ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 10. FINANCEIRO (public.financial_records)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'entrada' ou 'saida'
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  payment_method TEXT, -- 'PIX', 'Dinheiro', 'Cartao_Credito', etc.
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_period TEXT, -- 'mensal', 'semanal', etc.
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_records TO authenticated;
GRANT ALL ON public.financial_records TO service_role;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated manage finance" 
  ON public.financial_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 11. ESTOQUE (public.inventory_items / public.inventory_logs)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  supplier TEXT,
  quantity INT NOT NULL DEFAULT 0,
  min_quantity INT NOT NULL DEFAULT 0,
  purchase_price NUMERIC(10,2) DEFAULT 0.00,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated manage inventory" 
  ON public.inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'entrada' ou 'saida'
  quantity INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_logs TO authenticated;
GRANT ALL ON public.inventory_logs TO service_role;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated manage inventory logs" 
  ON public.inventory_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 12. TRIGGERS DE ATUALIZAÇÃO (updated_at)
-- =========================================================================
CREATE TRIGGER update_professionals_updated_at
BEFORE UPDATE ON public.professionals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_anamnesis_updated_at
BEFORE UPDATE ON public.client_anamnesis
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_consent_updated_at
BEFORE UPDATE ON public.client_consent
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_records_updated_at
BEFORE UPDATE ON public.financial_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 13. SEED DOS DADOS INICIAIS (Administrador principal, serviços e profissionais)
-- =========================================================================

-- Seed de serviços iniciais
INSERT INTO public.services (name, category, duration, price, description, color) VALUES
('Extensão de Cílios - Volume Brasileiro', 'Cílios', 120, 150.00, 'Técnica com fios em formato de Y que proporciona volume e leveza.', '#AEE9E1'),
('Extensão de Cílios - Volume Russo', 'Cílios', 150, 180.00, 'Técnica avançada com aplicação de fans feitos à mão de 2D a 6D.', '#86efac'),
('Manutenção de Cílios', 'Cílios', 90, 90.00, 'Retoque dos cílios em até 20 dias após a aplicação.', '#fed7aa'),
('Design de Sobrancelhas', 'Sobrancelha', 45, 50.00, 'Modelagem de sobrancelhas com pinça de acordo com o visagismo facial.', '#fef08a'),
('Design de Sobrancelhas com Henna', 'Sobrancelha', 60, 75.00, 'Modelagem completa com aplicação de Henna de alta fixação.', '#fbcfe8')
ON CONFLICT DO NOTHING;

-- Seed de profissionais
INSERT INTO public.professionals (name, specialties, color, days_worked, work_hours_start, work_hours_end, commission_percent, commission_fixed, is_active) VALUES
('Ana Paula', ARRAY['Cílios', 'Sobrancelha'], '#0D9488', '{1,2,3,4,5,6}', '09:00', '19:00', 40.00, 0.00, true),
('Juliana Costa', ARRAY['Cílios'], '#6366F1', '{2,3,4,5,6}', '10:00', '18:00', 35.00, 5.00, true)
ON CONFLICT DO NOTHING;

-- Associar profissionais aos serviços (vincula todos para teste)
INSERT INTO public.professional_services (professional_id, service_id)
SELECT p.id, s.id FROM public.professionals p CROSS JOIN public.services s
ON CONFLICT DO NOTHING;

-- Seed de produtos em estoque
INSERT INTO public.inventory_items (name, category, brand, supplier, quantity, min_quantity, purchase_price, location) VALUES
('Fios de Cílios Ellipse 0.15D Mix', 'Cílios', 'Nagaraku', 'Distribuidora Lash', 15, 5, 29.90, 'Gaveta 1'),
('Cola para Cílios Elite HS-10 3ml', 'Cola', 'Elite', 'Lash Shop', 2, 3, 85.00, 'Frigobar'),
('Removedor em Gel Navina 15g', 'Removedor', 'Navina', 'Lash Shop', 8, 2, 22.50, 'Gaveta 2'),
('Henna Glance Castanho Médio', 'Henna', 'Rareway', 'Cosméticos Distribuidora', 4, 2, 45.00, 'Prateleira Sobrancelhas')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 14. SEED DO USUÁRIO ADMINISTRADOR (auth.users e public.user_roles)
-- =========================================================================

-- Inserir usuário na tabela de autenticação auth.users do Supabase se não existir
-- E-mail: studiobelamocacg@gmail.com
-- Senha: '22334456'
-- Criptografia com pgcrypto (extensão segura do postgres)
DO $$
DECLARE
  new_user_id UUID := 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'studiobelamocacg@gmail.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    )
    VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'studiobelamocacg@gmail.com',
      extensions.crypt('22334456', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Administrador Bela Moça"}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated',
      ''
    );

    -- Vincular o papel de admin em public.user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
