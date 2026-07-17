export interface Professional {
  id: string;
  name: string;
  avatar_url?: string | null;
  phone?: string | null;
  specialties: string[];
  color: string;
  days_worked: number[];
  work_hours_start: string;
  work_hours_end: string;
  commission_percent: number;
  commission_fixed: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  description?: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalService {
  professional_id: string;
  service_id: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  email?: string | null;
  birth_date?: string | null;
  cpf?: string | null;
  preferred_professional_id?: string | null;
  first_service_date?: string | null;
  status: 'Ativa' | 'Inativa';
  created_at: string;
  updated_at: string;
}

export interface ClientAnamnesis {
  client_id: string;
  alergias?: string | null;
  gestante: boolean;
  lactante: boolean;
  medicamentos?: string | null;
  problemas_oculares?: string | null;
  lentes_contato: boolean;
  doencas?: string | null;
  contraindicacoes?: string | null;
  questionario_cilios: any;
  signature?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientConsent {
  client_id: string;
  text_content?: string | null;
  signature?: string | null;
  signed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ClientPhoto {
  id: string;
  client_id: string;
  appointment_id?: string | null;
  url: string;
  category: 'Antes' | 'Depois' | 'Mapping' | 'Retencao' | 'Outras';
  created_at: string;
}

export interface ClientMapping {
  id: string;
  client_id: string;
  appointment_id?: string | null;
  photo_url?: string | null;
  curvaturas?: string | null;
  espessuras?: string | null;
  mapping_type?: string | null;
  marca_fios?: string | null;
  marca_cola?: string | null;
  observacoes?: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'falta';
  price: number;
  commission_paid?: number | null;
  payment_method?: string | null;
  duration: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
  professional?: Professional;
  service?: Service;
}

export interface FinancialRecord {
  id: string;
  type: 'entrada' | 'saida';
  category: string;
  amount: number;
  description?: string | null;
  payment_method?: string | null;
  is_recurring: boolean;
  recurrence_period?: string | null;
  record_date: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  supplier?: string | null;
  quantity: number;
  min_quantity: number;
  purchase_price?: number | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryLog {
  id: string;
  product_id: string;
  type: 'entrada' | 'saida';
  quantity: number;
  notes?: string | null;
  created_at: string;
}
