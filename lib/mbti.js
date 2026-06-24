// MBTI types, friendly labels, and a worker<->youth compatibility score.
// Compatibility is a 0-100 integer. Curated "golden pair" values come first
// (drawn from common MBTI relationship literature); anything not in the table
// falls back to a dichotomy-based model so every pairing yields a sensible score.

export const MBTI_TYPES = [
    { code: 'INTJ', label: 'INTJ · Architect' },
    { code: 'INTP', label: 'INTP · Logician' },
    { code: 'ENTJ', label: 'ENTJ · Commander' },
    { code: 'ENTP', label: 'ENTP · Debater' },
    { code: 'INFJ', label: 'INFJ · Advocate' },
    { code: 'INFP', label: 'INFP · Mediator' },
    { code: 'ENFJ', label: 'ENFJ · Protagonist' },
    { code: 'ENFP', label: 'ENFP · Campaigner' },
    { code: 'ISTJ', label: 'ISTJ · Logistician' },
    { code: 'ISFJ', label: 'ISFJ · Defender' },
    { code: 'ESTJ', label: 'ESTJ · Executive' },
    { code: 'ESFJ', label: 'ESFJ · Consul' },
    { code: 'ISTP', label: 'ISTP · Virtuoso' },
    { code: 'ISFP', label: 'ISFP · Adventurer' },
    { code: 'ESTP', label: 'ESTP · Entrepreneur' },
    { code: 'ESFP', label: 'ESFP · Entertainer' },
];

const VALID = new Set(MBTI_TYPES.map(t => t.code));

export function isValidMBTI(t) {
    return !!t && VALID.has(String(t).toUpperCase());
}

export function mbtiLabel(code) {
    if (!code) return '';
    const found = MBTI_TYPES.find(t => t.code === String(code).toUpperCase());
    return found ? found.label : String(code).toUpperCase();
}

// Curated complementary pairs (symmetric). Key = both codes sorted + joined.
const GOLDEN = {
    'ENFP|INTJ': 92,
    'ENTJ|INFP': 90,
    'ENFP|INFJ': 88,
    'ENTP|INTJ': 88,
    'ENFJ|INFP': 88,
    'ENTJ|INTP': 88,
    'ENTP|INFJ': 87,
    'ESFJ|ISFP': 86,
    'ESTJ|ISTP': 86,
    'ESFP|ISFJ': 86,
    'ESTP|ISTJ': 86,
    'ENFJ|INFJ': 84,
    'ENFP|ENFP': 80,
};

function pairKey(a, b) {
    return [a, b].sort().join('|');
}

// Dichotomy-based fallback. Shared intuition/sensing world-view matters most
// for mutual understanding; complementary energy (E/I) and lifestyle (J/P)
// add balance.
function fallbackScore(a, b) {
    let s = 50;
    if (a[1] === b[1]) s += 15;          // N/S aligned -> understand each other
    s += (a[2] === b[2]) ? 8 : 12;       // T/F: complementary slightly favoured
    s += (a[0] !== b[0]) ? 12 : 6;       // E/I: opposite energises
    s += (a[3] !== b[3]) ? 10 : 6;       // J/P: opposite balances
    return Math.max(0, Math.min(100, s));
}

// Returns 0-100 integer, or null if either type is missing/invalid.
export function calculateCompatibility(youthMBTI, workerMBTI) {
    if (!isValidMBTI(youthMBTI) || !isValidMBTI(workerMBTI)) return null;
    const a = String(youthMBTI).toUpperCase();
    const b = String(workerMBTI).toUpperCase();
    const golden = GOLDEN[pairKey(a, b)];
    if (golden != null) return golden;
    return fallbackScore(a, b);
}

export const BEST_MATCH_THRESHOLD = 75;
