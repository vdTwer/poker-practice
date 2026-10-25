import { useEffect } from 'react';
import type React from 'react';
import { useRoute, href } from './lib/router';
import { Home } from './pages/Home';
import { FirstHand } from './pages/FirstHand';
import { Rankings } from './pages/Rankings';
import { NameIt } from './pages/NameIt';
import { WhoWins } from './pages/WhoWins';
import { BestFive } from './pages/BestFive';
import { SidePots } from './pages/SidePots';
import { TapTheNuts } from './pages/TapTheNuts';
import { CountOuts } from './pages/CountOuts';
import { WetOrDry } from './pages/WetOrDry';
import { Play } from './pages/Play';
import { Glossary } from './pages/Glossary';
import { Position } from './pages/Position';
import { OpenFold } from './pages/OpenFold';
import { PaintRange } from './pages/PaintRange';
import { PotOdds } from './pages/PotOdds';
import { CallFold } from './pages/CallFold';
import { Equity } from './pages/Equity';
import { SidePotsLesson } from './pages/SidePotsLesson';
import { BoardLesson } from './pages/BoardLesson';
import { Locked } from './components/Locked';
import { nodeByPath, nodeState, migrateFromScores } from './lib/roadmap';
import { completeLesson, getCompletedLessons, getDrillScores, useCompletedLessons, useDrillScores } from './lib/storage';

const ROUTES: Record<string, () => React.JSX.Element> = {
  '/': Home,
  '/learn/first-hand': FirstHand,
  '/learn/rankings': Rankings,
  '/drill/name-it': NameIt,
  '/drill/who-wins': WhoWins,
  '/drill/best-five': BestFive,
  '/learn/side-pots': SidePotsLesson,
  '/drill/side-pots': SidePots,
  '/learn/board': BoardLesson,
  '/drill/nuts': TapTheNuts,
  '/drill/outs': CountOuts,
  '/drill/wet-dry': WetOrDry,
  '/learn/position': Position,
  '/drill/open-fold': OpenFold,
  '/drill/paint': PaintRange,
  '/learn/pot-odds': PotOdds,
  '/drill/call-fold': CallFold,
  '/drill/equity': Equity,
  '/play': Play,
  '/glossary': Glossary,
};

export function App() {
  const route = useRoute();
  const completed = useCompletedLessons();
  const scores = useDrillScores();
  useEffect(() => { migrateFromScores(getCompletedLessons(), getDrillScores()).forEach(completeLesson); }, []);
  const node = nodeByPath(route);
  const locked = node && nodeState(node, completed, scores) === 'locked';
  const Page = ROUTES[route] ?? Home;
  const section = route.startsWith('/play') ? 'play' : route.startsWith('/glossary') ? 'glossary' : 'learn';
  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <a className="brand" href={href('/')}>
            <span className="brand-mark" aria-hidden="true">♠</span>
            Poker <span className="long">Practice</span>
          </a>
          <nav className="nav" aria-label="Main">
            <a href={href('/')} className={section === 'learn' ? 'active' : ''}>Learn</a>
            <a href={href('/play')} className={section === 'play' ? 'active' : ''}>Play</a>
            <a href={href('/glossary')} className={section === 'glossary' ? 'active' : ''}>Words</a>
          </nav>
        </div>
      </header>
      <main>
        {locked ? <Locked node={node} key={route} /> : <Page key={route} />}
      </main>
    </>
  );
}
