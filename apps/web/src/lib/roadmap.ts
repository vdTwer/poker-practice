// The learning path: lessons in order, each unlocking its drills.
// A lesson opens once the lesson before it is finished; a drill opens once its lesson is.

export type NodeKind = 'lesson' | 'drill' | 'words' | 'play';

export interface PathNode {
  id: string;
  kind: NodeKind;
  title: string;
  text: string;
  path: string;
  /** For drills, words and play: the lesson that unlocks them. */
  lesson?: string;
}

export interface Stage {
  n: number;
  eyebrow: string;
  title: string;
  text: string;
  nodes: PathNode[];
}

export const STAGES: Stage[] = [
  {
    n: 0, eyebrow: 'Stage 0 · Foundations', title: 'Cards, table words and rules',
    text: "What the cards are, what the words mean and who wins. Strategy comes later: first the language.",
    nodes: [
      { id: 'first-hand', kind: 'lesson', title: 'Your first hand, slowly', text: 'One full hand dealt step by step, with every part of the table named as it appears.', path: '/learn/first-hand' },
      { id: 'name-it', kind: 'words', title: 'Name it', text: 'Something on the table lights up. Pick its name.', path: '/drill/name-it', lesson: 'first-hand' },
      { id: 'play', kind: 'play', title: 'Practice table', text: 'Play full hands against simple bots at 2 to 9 seats.', path: '/play', lesson: 'first-hand' },
      { id: 'rankings', kind: 'lesson', title: 'The ten hands', text: 'Every hand from high card to royal flush, best first. Finish with 5 right answers.', path: '/learn/rankings' },
      { id: 'who-wins', kind: 'drill', title: 'Who wins?', text: 'Players show their cards. Tap the winner.', path: '/drill/who-wins', lesson: 'rankings' },
      { id: 'best-five', kind: 'drill', title: 'Build the best five', text: 'Pick the five cards that make your best hand.', path: '/drill/best-five', lesson: 'rankings' },
      { id: 'side-pots-lesson', kind: 'lesson', title: 'All-in and side pots', text: 'What happens when someone runs out of chips but others keep betting.', path: '/learn/side-pots' },
      { id: 'side-pots', kind: 'drill', title: 'Side pots', text: 'Several players are all-in. Who wins how much?', path: '/drill/side-pots', lesson: 'side-pots-lesson' },
    ],
  },
  {
    n: 1, eyebrow: 'Stage 1 · Foundations', title: 'Reading the board',
    text: 'Before you can judge your hand, see what the board makes possible.',
    nodes: [
      { id: 'board-lesson', kind: 'lesson', title: 'Reading the board', text: 'The nuts, draws, outs, and wet or dry boards.', path: '/learn/board' },
      { id: 'nuts', kind: 'drill', title: 'Tap the nuts', text: 'Which hand is the best possible on this board?', path: '/drill/nuts', lesson: 'board-lesson' },
      { id: 'outs', kind: 'drill', title: 'Count your outs', text: 'Tap every card that completes your draw.', path: '/drill/outs', lesson: 'board-lesson' },
      { id: 'wet-dry', kind: 'drill', title: 'Wet or dry?', text: 'Sort flops by how many draws they allow.', path: '/drill/wet-dry', lesson: 'board-lesson' },
    ],
  },
  {
    n: 2, eyebrow: 'Stage 2 · Preflop', title: 'Position and opening hands',
    text: 'Which hands to raise first from each seat, at any table size.',
    nodes: [
      { id: 'position', kind: 'lesson', title: 'Position and opening hands', text: 'Explore which hands open from each seat, then pass a short check.', path: '/learn/position' },
      { id: 'open-fold', kind: 'drill', title: 'Open or fold?', text: 'Everyone folds to you. Raise or fold? Sets of 20.', path: '/drill/open-fold', lesson: 'position' },
      { id: 'paint', kind: 'drill', title: 'Paint the range', text: 'Colour the 13×13 grid yourself, then compare.', path: '/drill/paint', lesson: 'position' },
    ],
  },
  {
    n: 3, eyebrow: 'Stage 3 · The math', title: 'Pot odds and equity',
    text: 'Turn "I have a feeling" into "calling wins 4 chips on average".',
    nodes: [
      { id: 'pot-odds', kind: 'lesson', title: 'Pot odds', text: 'Drag the bet and your outs, watch the answer change, then pass a short check.', path: '/learn/pot-odds' },
      { id: 'call-fold', kind: 'drill', title: 'Call or fold?', text: 'You have a draw and face a bet. Graded in chips.', path: '/drill/call-fold', lesson: 'pot-odds' },
      { id: 'equity', kind: 'drill', title: 'Estimate your equity', text: 'Outs into percentages with the rule of 2 and 4.', path: '/drill/equity', lesson: 'pot-odds' },
    ],
  },
];

export const ALL_NODES = STAGES.flatMap((s) => s.nodes);
export const LESSONS = ALL_NODES.filter((n) => n.kind === 'lesson');

export type NodeState = 'locked' | 'open' | 'done';

export function lessonState(id: string, completed: Record<string, string>): NodeState {
  if (completed[id]) return 'done';
  const i = LESSONS.findIndex((l) => l.id === id);
  if (i <= 0) return 'open';
  return completed[LESSONS[i - 1].id] ? 'open' : 'locked';
}

/** Drills count as done once you've answered at least 10 spots in them. */
export const PRACTISED_AFTER = 10;

export function nodeState(node: PathNode, completed: Record<string, string>, scores: Record<string, { total: number }>): NodeState {
  if (node.kind === 'lesson') return lessonState(node.id, completed);
  if (!node.lesson || !completed[node.lesson]) return 'locked';
  return (scores[node.id]?.total ?? 0) >= PRACTISED_AFTER ? 'done' : 'open';
}

export function nodeByPath(path: string): PathNode | undefined {
  return ALL_NODES.find((n) => n.path === path);
}

export function lessonById(id: string): PathNode | undefined {
  return LESSONS.find((l) => l.id === id);
}

/** The next thing to do: the first open lesson, else the first open drill. */
export function nextUp(completed: Record<string, string>, scores: Record<string, { total: number }>): PathNode | undefined {
  return ALL_NODES.find((n) => n.kind === 'lesson' && nodeState(n, completed, scores) === 'open')
    ?? ALL_NODES.find((n) => nodeState(n, completed, scores) === 'open');
}

/**
 * People who used the app before the roadmap existed keep their progress: a drill they
 * already practised counts its lesson (and every lesson before it) as done.
 */
export function migrateFromScores(completed: Record<string, string>, scores: Record<string, { total: number }>): string[] {
  let last = -1;
  for (const n of ALL_NODES) {
    if (n.lesson && (scores[n.id]?.total ?? 0) > 0) last = Math.max(last, LESSONS.findIndex((l) => l.id === n.lesson));
  }
  return LESSONS.slice(0, last + 1).map((l) => l.id).filter((id) => !completed[id]);
}
