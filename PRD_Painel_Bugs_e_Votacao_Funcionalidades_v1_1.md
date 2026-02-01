# PRD, Painel de Bugs e Votação de Funcionalidades
SaaS de gestão de tarefas e financeiro para agência de publicidade

Versão: 1.1  
Data: 01/02/2026  
Stack alvo: Supabase (Postgres, Storage, Auth, Edge Functions) e ClaudeCode para implementação

## 1. Contexto e Objetivo
Este PRD define um módulo público de feedback do produto com duas áreas:

1. **Recebimento de bugs**, com formulário de texto e upload de screenshots.
2. **Solicitação e votação (upvote) de novas funcionalidades**, com criação de pedidos e ordenação por votos.

A área de votação é pública, sem login. Cada dispositivo pode votar **uma vez por funcionalidade**, por meio de um **voter_token** persistido localmente (cookie ou localStorage) e reforçado por **unicidade no banco**.

## 2. Metas e Métricas (Success Metrics)
- Reduzir ruído de suporte, concentrar relatos em formulário padronizado.
- Tornar priorização de roadmap baseada em sinal real de uso, lista ordenada por votos.
- Tempo médio para triagem de bug, meta ≤ 24h úteis (processo interno).
- Adoção, meta ≥ 20% dos usuários ativos visitando /features em 90 dias.
- Qualidade de bug report, meta ≥ 60% com passos para reproduzir ou contexto de ambiente.

## 3. Escopo
### 3.1 In-Scope (MVP)
- Página pública **/bugs**, formulário de bug, texto, upload de screenshots.
- Página pública **/features**, criação de sugestão e lista com upvote.
- Bloco no topo de **/features** com **Funcionalidades em desenvolvimento**, editável apenas por admin.
- Persistência em Supabase Postgres, arquivos em Supabase Storage.
- Regra de voto, 1 voto por funcionalidade por dispositivo, com voter_token.
- Admin básico, login, CRUD de itens em desenvolvimento, moderação mínima (ocultar itens), triagem de bugs.
- Proteção mínima anti-spam, rate limiting e honeypot (ver seção 10).

### 3.2 Out of Scope (por enquanto)
- Login para usuários finais.
- Anti-fraude robusto multi-dispositivo (além do token local).
- Comentários/discussões por sugestão.
- Integração automática com Jira, Linear, Asana.
- Notificações por e-mail para público (pode ser fase 2).
- Roadmap público completo com status detalhado e estimativas firmes.

## 4. Perfis de Usuário
- **Usuário final (público)**, acessa sem login, reporta bug, cria sugestão e vota.
- **Admin (interno)**, gerencia lista de desenvolvimento, modera bugs e sugestões, altera status, acessa anexos.

## 5. Fluxos Principais
### 5.1 Reportar Bug
1. Usuário acessa **/bugs**.
2. Preenche título e descrição.
3. Opcional, inclui passos para reproduzir, resultados esperado e obtido, URL, módulo, severidade percebida.
4. Opcional, faz upload de 1 a 5 screenshots.
5. Envia, sistema cria registro e associa anexos.
6. UI retorna confirmação com ID público (ex.: **BUG-000123**) e data/hora.

### 5.2 Sugerir Funcionalidade
1. Usuário acessa **/features**.
2. Vê no topo **Funcionalidades em desenvolvimento** (somente leitura).
3. Abaixo, vê lista de sugestões ordenada por votos (default), com busca.
4. Usuário cria uma sugestão com título e descrição.
5. Item entra na lista e já pode receber votos.

### 5.3 Votar em Funcionalidade, 1 voto por dispositivo
1. Usuário clica em **Votar**.
2. Frontend obtém ou cria **voter_token** (UUID v4) e mantém localmente.
3. Backend registra voto, reforçando unicidade por (feature_id, voter_token).
4. UI atualiza contador e marca estado **Votado**.
5. Se backend retornar conflito (já votado), UI marca como **Votado** e não altera contagem.

### 5.4 Admin, atualizar Funcionalidades em desenvolvimento
1. Admin acessa **/admin** e autentica via Supabase Auth.
2. Admin cria, edita, remove e reordena itens do topo (drag and drop).
3. Itens ativos aparecem no topo de /features na ordem definida.

## 6. Requisitos Funcionais
### 6.1 Tela de Bugs, /bugs
Campos obrigatórios:
- **Título**, mínimo 5, máximo 120 caracteres.
- **Descrição**, mínimo 20, máximo 4000 caracteres.

Campos opcionais, recomendados:
- Passos para reproduzir.
- Resultado esperado.
- Resultado obtido.
- Módulo, ex.: Financeiro, Tarefas, Relatórios, Integrações.
- Severidade percebida, low, medium, high.
- URL, rota do sistema onde ocorreu.
- Ambiente (captura automática + opcionalmente editável), SO, navegador, device, app_version, viewport, user_agent.

Uploads:
- Aceitar PNG, JPG, WebP.
- Máximo 10MB por arquivo.
- Até 5 arquivos por bug (configurável).
- Upload com feedback de progresso e retry.

Persistência:
- Criar registro no Postgres.
- Upload dos arquivos para Storage, bucket **privado**.
- Associar anexos ao bug por storage_path e metadados.
- Somente admin consegue obter URLs dos anexos via **signed URLs**.

### 6.2 Tela de Funcionalidades, /features
Seções:
1. **Funcionalidades em desenvolvimento**, topo, somente leitura para público, editável por admin.
2. **Formulário de nova sugestão**, título e descrição.
3. **Lista de sugestões**, com votos, ordenação, busca.

Formulário de sugestão:
- Título, mínimo 5, máximo 120.
- Descrição, mínimo 20, máximo 2000.
- Campo honeypot oculto, ver seção 10.

Lista:
- Exibir título, descrição curta, contagem de votos, data de criação.
- Ordenação default, mais votadas.
- Alternar para mais recentes.
- Busca por texto em título e descrição.
- Opção futura, tags ou módulo, não é obrigatório no MVP.

Upvote:
- 1 voto por feature por dispositivo.
- Botão com estados, disponível, carregando, votado.
- UI otimista, soma 1 localmente, com rollback em erro que não seja 409.

### 6.3 Admin e Moderação
Admin autenticado:
- CRUD e reordenação de development_items.
- Moderação mínima em feature_requests, marcar como hidden.
- Triagem de bugs, marcar status, adicionar nota interna (opcional).

## 7. Requisitos Não Funcionais
- Performance, lista inicial deve carregar em ≤ 2s em conexão padrão.
- Resiliência, upload deve ter retry e feedback.
- Segurança, RLS e políticas de Storage, ver seção 9.
- Observabilidade, logs de falhas no frontend e backend.
- LGPD, coletar o mínimo possível, não exigir e-mail, inserir nota sobre uso de armazenamento local para voto.

## 8. Regras de Voto, fonte de verdade e consistência
Regra oficial:
- O **banco é a fonte de verdade** para “já votou”, via constraint UNIQUE.
- O armazenamento local é um cache de UI.

Detalhes:
- Ao primeiro acesso a /features, gerar voter_token e persistir.
- No clique, enviar voter_token e feature_id.
- No backend, aplicar constraint UNIQUE (feature_id, voter_token).
- Em caso de conflito, responder 409.
- O frontend deve tratar 409 como “voto já registrado” e travar o botão.

Limitações aceitas no MVP:
- Limite é por dispositivo, limpar storage permite novo voto.
- Não há prevenção robusta multi-dispositivo.

## 9. Modelo de Dados (Supabase Postgres)
### 9.1 bugs
- id, uuid, PK, default gen_random_uuid()
- public_id, text, unique, ex.: BUG-000123
- title, text
- description, text
- repro_steps, text, nullable
- expected_result, text, nullable
- actual_result, text, nullable
- module, text, nullable
- severity, text, nullable, check in (low, medium, high)
- environment, jsonb, nullable, ex.: {
  "os": "...",
  "browser": "...",
  "device": "...",
  "app_version": "...",
  "viewport": "...",
  "user_agent": "..."
}
- page_url, text, nullable
- status, text, default 'new', check in (new, triaged, in_progress, resolved, wont_fix)
- created_at, timestamptz, default now()

### 9.2 bug_attachments
- id, uuid, PK
- bug_id, uuid, FK -> bugs.id
- storage_path, text
- mime_type, text
- file_size, int
- created_at, timestamptz

Observação:
- Não armazenar public_url fixa, gerar signed URL para admin sob demanda.

### 9.3 feature_requests
- id, uuid, PK
- title, text
- description, text
- status, text, default 'open', check in (open, planned, in_dev, shipped, rejected, hidden)
- created_at, timestamptz

### 9.4 feature_votes
- id, uuid, PK
- feature_id, uuid, FK -> feature_requests.id
- voter_token, uuid
- created_at, timestamptz
- UNIQUE (feature_id, voter_token)

### 9.5 development_items
- id, uuid, PK
- title, text
- description, text, nullable
- order_index, int
- link, text, nullable
- is_active, boolean, default true
- created_at, timestamptz

### 9.6 view pública, contagem de votos (decisão do PRD)
Decisão do PRD:
- **Não armazenar votes_count** em feature_requests no MVP.
- Usar view agregada para contagem e ordenação.

Exemplo de view:
- feature_votes_agg: SELECT feature_id, count(*) as votes FROM feature_votes GROUP BY feature_id

A listagem pública faz join feature_requests + feature_votes_agg, com COALESCE(votes, 0).

## 10. Segurança, RLS, Storage e Anti-spam
### 10.1 Identificação de Admin
- Supabase Auth para login.
- Tabela admins(user_id uuid primary key) e policy baseada em auth.uid() presente nesta tabela.

### 10.2 RLS, políticas sugeridas
Público, role anon:
- bugs, permitir INSERT apenas, sem SELECT.
- bug_attachments, preferível não permitir INSERT direto por anon, upload via Edge Function, ou permitir INSERT apenas quando bug_id existir e dentro de janela curta, se implementar.
- feature_requests, permitir SELECT e INSERT, permitir UPDATE apenas admin.
- feature_votes, permitir INSERT, sem SELECT direto, contagem via view.
- development_items, permitir SELECT apenas em is_active=true, sem INSERT, UPDATE, DELETE.

Admin, role authenticated com verificação em admins:
- CRUD total em bugs, bug_attachments, feature_requests, feature_votes, development_items.
- Capacidade de marcar hidden e alterar status.

### 10.3 Storage, screenshots de bugs
- Bucket bug-screenshots privado.
- Upload preferencial via Edge Function para controlar tamanho, tipo, rate limit.
- Para exibição admin, gerar signed URLs com TTL curto, ex.: 5 a 15 minutos.

### 10.4 Anti-spam mínimo, recomendado no MVP
- Rate limiting por IP e por voter_token em endpoints de:
  - criação de bug
  - criação de feature
  - voto
- Honeypot field nos formulários.
- Opcional, se necessário, Cloudflare Turnstile apenas para criação de bug e criação de feature.

## 11. APIs e Contratos (Edge Functions ou camada API)
Mesmo com supabase-js direto, manter contratos reduz ambiguidades.

### 11.1 Criar bug
POST /api/bugs  
Body:
- title
- description
- repro_steps?
- expected_result?
- actual_result?
- module?
- severity?
- environment?
- page_url?

Retorna:
- bug_id
- public_id

### 11.2 Upload de anexos
POST /api/bugs/{bug_id}/attachments  
Body: multipart, arquivos 1 a 5  
Retorna: lista de attachment_ids e storage_paths

### 11.3 Criar feature request
POST /api/features  
Body:
- title
- description  
Retorna: feature_id

### 11.4 Votar em feature
POST /api/features/{feature_id}/vote  
Body:
- voter_token

Regras:
- Se voto já existir (constraint UNIQUE), retornar 409.
- Caso contrário, inserir voto e retornar contagem atual.

Retorna:
- votes

### 11.5 Listar development items
GET /api/development-items  
Retorna: itens ativos ordenados por order_index

## 12. UX, UI e Regras de Interface
- Público não loga.
- CTA claros, Reportar bug, Sugerir funcionalidade.
- Feedbacks:
  - bug, estado de upload com progresso.
  - voto, estado loading e desabilitado após voto.
- Listagem de features:
  - default por votos.
  - alternar para recentes.
  - busca por texto.
- Nota LGPD e de armazenamento local na página /features:
  - “Usamos armazenamento local para garantir 1 voto por funcionalidade neste dispositivo.”

## 13. Critérios de Aceitação (Acceptance Criteria)
### 13.1 Bugs
- Dado um usuário anônimo, quando ele envia título e descrição válidos, então um bug é criado e retorna um public_id.
- Dado um upload válido, quando finaliza, então o anexo fica no bucket privado com storage_path associado ao bug.
- Dado um arquivo inválido, tipo ou tamanho, o sistema bloqueia e informa o motivo.
- Dado um usuário público, ele não consegue listar bugs existentes nem acessar anexos sem permissão.
- Dado um admin, ele consegue acessar o bug e visualizar anexos via signed URL.

### 13.2 Features e votos
- Dado um usuário anônimo, quando cria sugestão válida, então o item aparece na lista pública.
- Dado um voter_token, quando vota em um feature ainda não votado no dispositivo, então o voto é inserido e a contagem aumenta.
- Dado que já votou, quando tenta votar novamente, então o backend retorna 409 e a UI permanece em estado Votado.
- Ao recarregar a página, a UI marca como Votado as features votadas naquele dispositivo, usando cache local, e garante consistência com o backend em caso de conflito.

### 13.3 Funcionalidades em desenvolvimento
- Dado um usuário público, ele vê apenas itens ativos ordenados.
- Dado um admin autenticado, ele consegue criar, editar, desativar e reordenar itens, e isso reflete na página pública.

## 14. Plano de Entrega (MVP sugerido)
1. Fase 1, modelagem de banco, view de votos, bucket privado, RLS.
2. Fase 2, UI pública /bugs, criação e upload via Edge Function.
3. Fase 3, UI pública /features, criação e listagem com busca e ordenação.
4. Fase 4, upvote com voter_token, constraint UNIQUE, UI otimista, tratamento 409.
5. Fase 5, admin /admin, CRUD de development_items, moderação mínima.
6. Fase 6, hardening, rate limit, logs, refinamentos de UX.

## 15. Notas de Implementação (ClaudeCode)
- Separar módulos, bugs, features, votes, devItems.
- Implementar getOrCreateVoterToken() e getVotedFeatureSet().
- Para listagem, consultar view agregada e ordenar por votes.
- Validar entradas no frontend e repetir validações no backend, principalmente nos endpoints públicos.
- Criar utilitários para honeypot e rate limiting no Edge Function.
