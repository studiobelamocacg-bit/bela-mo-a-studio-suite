# Studio Bela Moça — Plano de Construção em Fases

Sistema completo de gestão de estúdio de beleza com backoffice (admin), site público de agendamento e PWA. Construção incremental para garantir qualidade em cada camada.

## Stack & Fundações

- **Frontend:** TanStack Start + React + Tailwind (mobile-first)
- **Backend:** Lovable Cloud (Postgres + Auth + Storage + Realtime)
- **Auth:** e-mail/senha, múltiplos usuários (perfis: `admin`, `profissional`)
- **Design system:** Tiffany (#AEE9E1) + branco + preto + dourado, tipografia serif elegante para títulos + sans-serif para corpo, tokens semânticos em `src/styles.css`
- **Realtime:** agenda sincronizada admin ↔ público via Supabase Realtime
- **Storage:** fotos de clientes, assinaturas, logo

---

## Fase 1 — Fundação (design system + auth + site público estático)

**Entrega:**
- Design system completo (cores Tiffany/branco/preto/dourado, tipografia, componentes shadcn customizados)
- Página pública inicial `/` bonita: banner com logo, frase elegante, CTA de agendamento, cards de serviços (mock), seção profissionais (mock), botões fixos WhatsApp + Instagram
- Login admin `/auth` (e-mail/senha)
- Layout admin (`/_authenticated/*`) com menu lateral (Dashboard, Agenda, Clientes, Profissionais, Serviços, Financeiro, Estoque, Configurações) — mobile vira hambúrguer
- Schema inicial: `profiles`, `user_roles` (com enum `app_role`), políticas RLS
- Configurações básicas + upload de logo

**Fim da fase:** você já loga, vê o shell do admin, e a home pública está publicável.

---

## Fase 2 — Cadastros-base (Serviços, Profissionais, Clientes)

**Entrega:**
- CRUD **Serviços** (nome, categoria, duração, preço, cor, ativo, profissionais que executam)
- CRUD **Profissionais** (dados, foto, especialidades, cor da agenda, horário/dias de trabalho, comissão %, status)
- CRUD **Clientes** com ficha em abas:
  - **Dados** (nome, telefone, WhatsApp, Instagram, aniversário, CPF, e-mail, profissional responsável, status)
  - **Anamnese** (formulário editável + assinatura digital em canvas — mouse/touch)
  - **Autorização de imagem** (texto + assinatura + exportar PDF)
  - **Fotos** (upload múltiplo, galeria por atendimento)
  - **Mapping** (foto + curvaturas, espessuras, marcas, cola, observações)
  - **Histórico** (populado na Fase 3)
- Lista de clientes com busca, filtros (ativa/inativa, sem retorno 30/60/90 dias, aniversariantes)

**Fim da fase:** você já cadastra sua base real de clientes e equipe.

---

## Fase 3 — Agenda inteligente + Site público de agendamento

**Entrega:**
- **Agenda admin** estilo Google Calendar:
  - Views dia / semana / mês / lista
  - Uma coluna por profissional (dia/semana)
  - Drag & drop para reagendar
  - Bloqueios, férias, horários recorrentes
  - Status do agendamento: agendado / confirmado / compareceu / faltou / cancelado
  - Realtime (mudanças aparecem em todos os dispositivos abertos)
- **Site público `/agendar`** mobile-first, mínimo de cliques:
  1. Escolher serviço → 2. profissional → 3. data → 4. horário disponível → 5. dados da cliente → 6. confirmar
- Cálculo de horários disponíveis considerando: duração do serviço, horário de trabalho da profissional, bloqueios, tempo mínimo entre atendimentos, agendamentos já existentes
- Ao confirmar: cria cliente (se novo), cria agendamento, some da grade pública, aparece na admin

**Fim da fase:** clientes já agendam sozinhas pelo celular.

---

## Fase 4 — Financeiro + Atendimentos + Dashboard

**Entrega:**
- Registrar **atendimento realizado** ligado ao agendamento (serviço, valor, forma de pagamento, observações) → alimenta histórico da cliente e financeiro automaticamente
- **Financeiro:** entradas, saídas, categorias, contas fixas/variáveis, fluxo de caixa, formas de pagamento (PIX, dinheiro, crédito, débito, transferência), filtros dia/semana/mês/ano, relatórios
- **Dashboard** com todos os indicadores pedidos: clientes ativas, novas no mês, aplicações/manutenções hoje/mês/ano, faturamento hoje/mês/ano, entradas/saídas/lucro, aniversariantes hoje e 7 dias, clientes sem retorno 30/60/90 dias com lista clicável, alertas de estoque
- Gráficos: faturamento mensal, crescimento de clientes, evolução de atendimentos (Recharts)

**Fim da fase:** você vê a saúde do estúdio em tempo real.

---

## Fase 5 — Estoque + Relacionamento

**Entrega:**
- CRUD produtos (nome, categoria, marca, fornecedor, quantidade, mínima, valor de compra, localização)
- Registrar entrada/saída, histórico
- Alertas quando abaixo do mínimo (badge vermelho na lista + card no dashboard)
- Módulo Relacionamento: exportar CSV de aniversariantes e clientes inativas, mensagens WhatsApp pré-preenchidas (link `wa.me`)

---

## Fase 6 — PWA + Polimento

**Entrega:**
- Manifesto PWA (nome, ícones do Studio Bela Moça, tema Tiffany, `display: standalone`)
- Ícones em todos os tamanhos, apple-touch-icon
- Instalável em Android e iPhone via "Adicionar à tela inicial"
- Otimização de imagens, lazy loading, revisão de performance mobile
- QA final em breakpoints (smartphone, tablet, notebook, widescreen)
- Estrutura preparada (hooks/interfaces vazios) para integrações futuras: WhatsApp API, Meta Conversion API, Google Calendar, Mercado Pago/Stripe, NF-e, notificações push

---

## Regras técnicas importantes

- Todo dado sensível protegido por RLS: cada profissional vê apenas suas clientes/agenda (admin vê tudo)
- Papéis armazenados em `user_roles` separado (nunca no perfil) — obrigatório por segurança
- Nada de cores hardcoded em componentes — só tokens do design system
- Mobile-first: cada tela é projetada primeiro no 375px, depois escala
- Assinatura digital como imagem PNG salva no Storage
- PDFs gerados client-side (jsPDF) para autorização de imagem

---

## Como vamos trabalhar

Depois que você aprovar este plano, eu ativo o Lovable Cloud e começo pela **Fase 1**. Ao final de cada fase eu te aviso, você testa, e seguimos para a próxima. Se quiser reordenar fases (por exemplo, priorizar o site público antes do admin completo), me avise antes de começar.

**Pronto para eu iniciar a Fase 1?**