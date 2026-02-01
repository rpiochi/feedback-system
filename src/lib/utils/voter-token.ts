const VOTER_TOKEN_KEY = 'voter_token';
const VOTED_FEATURES_KEY = 'voted_features';

/**
 * Obtém ou cria um voter_token único para o dispositivo
 */
export function getOrCreateVoterToken(): string {
  if (typeof window === 'undefined') {
    throw new Error('getOrCreateVoterToken deve ser chamado apenas no cliente');
  }

  let token = localStorage.getItem(VOTER_TOKEN_KEY);

  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(VOTER_TOKEN_KEY, token);
  }

  return token;
}

/**
 * Obtém o set de feature_ids já votados neste dispositivo
 */
export function getVotedFeatureSet(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }

  const stored = localStorage.getItem(VOTED_FEATURES_KEY);

  if (!stored) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(stored);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

/**
 * Marca uma feature como votada no cache local
 */
export function markFeatureAsVoted(featureId: string): void {
  if (typeof window === 'undefined') return;

  const votedSet = getVotedFeatureSet();
  votedSet.add(featureId);
  localStorage.setItem(VOTED_FEATURES_KEY, JSON.stringify([...votedSet]));
}

/**
 * Verifica se uma feature já foi votada (cache local)
 */
export function hasVotedForFeature(featureId: string): boolean {
  return getVotedFeatureSet().has(featureId);
}
