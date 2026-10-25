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

const ROUTES: Record<string, () => React.JSX.Element> = {
  '/': Home,
  '/learn/first-hand': FirstHand,
  '/learn/rankings': Rankings,
  '/drill/name-it': NameIt,
  '/drill/who-wins': WhoWins,
  '/drill/best-five': BestFive,
  '/drill/side-pots': SidePots,
  '/drill/nuts': TapTheNuts,
  '/drill/outs': CountOuts,
  '/drill/wet-dry': WetOrDry,
  '/play': Play,
  '/glossary': Glossary,
};

export function App() {
  const route = useRoute();
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
        <Page key={route} />
      </main>
    </>
  );
}
