// Tipos gerados baseados no schema do Supabase

export type BugSeverity = 'low' | 'medium' | 'high';
export type BugStatus = 'new' | 'triaged' | 'in_progress' | 'resolved' | 'wont_fix';
export type FeatureStatus = 'open' | 'planned' | 'in_dev' | 'shipped' | 'rejected' | 'hidden';

export interface BugEnvironment {
  os?: string;
  browser?: string;
  device?: string;
  app_version?: string;
  viewport?: string;
  user_agent?: string;
}

export interface Bug {
  id: string;
  public_id: string;
  title: string;
  description: string;
  repro_steps: string | null;
  expected_result: string | null;
  actual_result: string | null;
  module: string | null;
  severity: BugSeverity | null;
  environment: BugEnvironment | null;
  page_url: string | null;
  status: BugStatus;
  admin_notes: string | null;
  created_at: string;
}

export interface BugAttachment {
  id: string;
  bug_id: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  created_at: string;
}

export interface FeatureVote {
  id: string;
  feature_id: string;
  voter_token: string;
  created_at: string;
}

export interface DevelopmentItem {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  link: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Admin {
  user_id: string;
  created_at: string;
}

// Views
export interface FeatureWithVotes extends FeatureRequest {
  votes: number;
}

// Tipos para criação (sem campos gerados automaticamente)
export interface CreateBugInput {
  title: string;
  description: string;
  repro_steps?: string;
  expected_result?: string;
  actual_result?: string;
  module?: string;
  severity?: BugSeverity;
  environment?: BugEnvironment;
  page_url?: string;
}

export interface CreateFeatureInput {
  title: string;
  description: string;
}

export interface CreateVoteInput {
  feature_id: string;
  voter_token: string;
}

export interface CreateDevelopmentItemInput {
  title: string;
  description?: string;
  order_index: number;
  link?: string;
  is_active?: boolean;
}

// Tipos para atualização
export interface UpdateBugInput {
  status?: BugStatus;
  admin_notes?: string;
}

export interface UpdateFeatureInput {
  title?: string;
  description?: string;
  status?: FeatureStatus;
}

export interface UpdateDevelopmentItemInput {
  title?: string;
  description?: string;
  order_index?: number;
  link?: string;
  is_active?: boolean;
}

// Tipos de resposta da API
export interface CreateBugResponse {
  bug_id: string;
  public_id: string;
}

export interface VoteResponse {
  votes: number;
  already_voted?: boolean;
}

// Módulos disponíveis
export const MODULES = [
  'Financeiro',
  'Tarefas',
  'Relatórios',
  'Integrações',
  'Outro',
] as const;

export type Module = (typeof MODULES)[number];
