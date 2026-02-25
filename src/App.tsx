import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DisplayLobby from './components/DisplayLobby';
import DisplayGame from './components/DisplayGame';
import LobbyScreen from './components/LobbyScreen';
import JoinScreen from './components/JoinScreen';
import GameScreen from './components/GameScreen';
import GameOver from './components/GameOver';
import PhoneGameOver from './components/PhoneGameOver';
import Settings from './components/Settings';
import { Profile, FoundWord, GameSettings, DEFAULT_SETTINGS, PlayerResult } from './types';
import { getActiveProfile } from './storage';
import { getSocket } from './socket';
import './App.css';

type DisplayView = 'display-lobby' | 'display-game' | 'display-waiting' | 'display-gameover';
type PhoneView   = 'join' | 'host-lobby' | 'player-lobby' | 'game' | 'phone-gameover';
type AppView     = DisplayView | PhoneView;

function App() {
  // Capture once at mount — never recompute from window.location.search because
  // handleJoinDone calls replaceState() which strips ?room= before the join-room
  // effect fires, making isDisplayMode flip to true and silently aborting the emit.
  const [joinRoomId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('room')
  );
  const isDisplayMode = !joinRoomId;

  const [view, setView]             = useState<AppView>(isDisplayMode ? 'display-lobby' : 'join');
  const [profile, setProfile]       = useState<Profile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isHostPlayer, setIsHostPlayer] = useState(false);

  const [roomId] = useState(() => joinRoomId ?? uuidv4());

  const [gameSeed, setGameSeed]         = useState(() => Math.floor(Math.random() * 0xffffffff));
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [roomPlayers, setRoomPlayers]   = useState<{ id: string; name: string; avatar: string; isHost?: boolean }[]>([]);
  const [networkIp, setNetworkIp]       = useState<string | null>(null);

  const [lastScore, setLastScore] = useState(0);
  const [lastWords, setLastWords] = useState<FoundWord[]>([]);
  const [allResults, setAllResults] = useState<PlayerResult[]>([]);
  const [waitingForResults, setWaitingForResults] = useState(false);
  const waitingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDisplayMode) { setLoading(false); return; }
    const p = getActiveProfile();
    if (p) setProfile(p);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const serverBase = window.location.port === '3000'
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : window.location.origin;
    fetch(`${serverBase}/api/network-ip`)
      .then((r) => r.json())
      .then((d) => setNetworkIp(d.ip))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const s = getSocket();

    s.on('room-update', (players: { id: string; name: string; avatar: string; isHost?: boolean }[]) => {
      setRoomPlayers(players);
    });

    s.on('game-started', ({ seed, settings }: { seed: number; settings: GameSettings }) => {
      setGameSeed(seed);
      setGameSettings(settings);
      setAllResults([]);
      setWaitingForResults(false);
      if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
      setView((v) => v.startsWith('display') ? 'display-game' : 'game');
    });

    s.on('you-are-host', () => {
      setIsHostPlayer(true);
      setView('host-lobby');
    });

    s.on('game-in-progress', ({ seed, settings }: { seed: number; settings: GameSettings }) => {
      setGameSeed(seed);
      setGameSettings(settings);
      setView('game');
    });

    s.on('room-not-found', () => {
      if (!isDisplayMode) setView('join');
    });

    s.on('all-results', (results: PlayerResult[]) => {
      setAllResults(results);
      setWaitingForResults(false);
      if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
      setView((v) => v.startsWith('display') ? 'display-gameover' : 'phone-gameover');
    });

    s.on('return-to-lobby', () => {
      // Display: go to display-lobby; phone non-hosts: go to player-lobby waiting screen
      setView((v) => {
        if (v.startsWith('display')) return 'display-lobby';
        return 'player-lobby';
      });
    });

    return () => {
      s.off('room-update');
      s.off('game-started');
      s.off('you-are-host');
      s.off('game-in-progress');
      s.off('room-not-found');
      s.off('all-results');
      s.off('return-to-lobby');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDisplayMode) return;
    getSocket().emit('display-join', { roomId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Fire for both player-lobby and host-lobby so that switching profiles
    // in Settings while in either lobby re-announces the player to the server.
    if (isDisplayMode || !profile || (view !== 'player-lobby' && view !== 'host-lobby')) return;
    getSocket().emit('join-room', {
      roomId,
      player: { id: profile.id, name: profile.name, avatar: profile.avatar },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, profile?.id]);

  const appPort  = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
  const host     = networkIp ?? window.location.hostname;
  const portPart = (appPort === '80' || appPort === '443') ? '' : `:${appPort}`;
  const joinUrl  = `${window.location.protocol}//${host}${portPart}${window.location.pathname}?room=${roomId}`;

  const handleJoinDone = (p: Profile) => {
    setProfile(p);
    // Do NOT strip ?room= from the URL — if the user refreshes on iPhone,
    // the query param must still be present so joinRoomId stays non-null
    // and isDisplayMode stays false (otherwise refresh renders the display lobby).
    setView('player-lobby');
  };

  const handlePlay = (settings: GameSettings) => {
    const seed = Math.floor(Math.random() * 0xffffffff);
    const s = getSocket();
    if (s.connected) {
      s.emit('start-game', { roomId, seed, settings });
    } else {
      setGameSeed(seed);
      setGameSettings(settings);
      setView('game');
    }
  };

  const handleGameOver = (score: number, words: FoundWord[]) => {
    setLastScore(score);
    setLastWords(words);
    if (roomPlayers.length > 1) {
      setWaitingForResults(true);
      waitingTimerRef.current = setTimeout(() => {
        setWaitingForResults(false);
        setView('phone-gameover');
      }, 5000);
    } else {
      setView('phone-gameover');
    }
  };

  // Play Again: host immediately kicks off a new round with the same settings
  const handlePlayAgain = () => {
    if (isDisplayMode) { setView('display-lobby'); return; }
    if (isHostPlayer) {
      const seed = Math.floor(Math.random() * 0xffffffff);
      const s = getSocket();
      if (s.connected) {
        s.emit('start-game', { roomId, seed, settings: gameSettings });
      } else {
        setGameSeed(seed);
        setView('game');
      }
    } else {
      // Non-host: go to waiting screen; host's start-game event will move them
      setView('player-lobby');
    }
  };

  // Back to Lobby: host returns the whole party to the lobby
  const handleBackToLobby = () => {
    if (isDisplayMode) { setView('display-lobby'); return; }
    if (isHostPlayer) {
      getSocket().emit('return-to-lobby', { roomId });
    }
    setView(isHostPlayer ? 'host-lobby' : 'player-lobby');
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-icon"></div>
        <p>Joggle</p>
      </div>
    );
  }

  //  DISPLAY (TV/PC) 
  if (isDisplayMode) {
    return (
      <div className="app-root">
        {view === 'display-lobby' && (
          <DisplayLobby joinUrl={joinUrl} players={roomPlayers} />
        )}
        {view === 'display-game' && (
          <DisplayGame seed={gameSeed} settings={gameSettings} players={roomPlayers} joinUrl={joinUrl} />
        )}
        {view === 'display-waiting' && (
          <div className="display-waiting">
            <h1 className="display-title">Joggle</h1>
            <div className="waiting-dots"><span /><span /><span /></div>
            <p>Tallying results</p>
          </div>
        )}
        {view === 'display-gameover' && (
          <GameOver
            score={0}
            foundWords={[]}
            seed={gameSeed}
            boardSize={gameSettings.boardSize}
            allResults={allResults}
            currentPlayerId="display"
            joinUrl={joinUrl}
            onPlayAgain={handlePlayAgain}
            onGoHome={handlePlayAgain}
          />
        )}
      </div>
    );
  }

  //  PHONE 
  return (
    <div className="app-root">
      {view === 'join' && (
        <JoinScreen
          roomCode={roomId.slice(0, 6)}
          onJoin={handleJoinDone}
          onGoHome={() => {
            window.history.replaceState({}, '', window.location.pathname);
            setView('join');
          }}
        />
      )}

      {view === 'host-lobby' && profile && (
        <LobbyScreen
          onPlay={handlePlay}
          players={roomPlayers.length > 0 ? roomPlayers : [{ id: profile.id, name: profile.name, avatar: profile.avatar }]}
          profileName={profile.name}
          profileAvatar={profile.avatar}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {view === 'player-lobby' && profile && (
        <div className="waiting-screen">
          <div className="waiting-card">
            <h1 className="game-title">Joggle</h1>
            <div className="waiting-avatar">{profile.avatar}</div>
            <p className="waiting-name">{profile.name}</p>
            <div className="waiting-dots"><span /><span /><span /></div>
            <p className="waiting-text">Waiting for the host to start&hellip;</p>
            <button className="btn-secondary" style={{ marginTop: 24 }}
              onClick={() => { window.history.replaceState({}, '', window.location.pathname); setView('join'); }}>
               Leave Room
            </button>
          </div>
        </div>
      )}

      {view === 'game' && profile && !waitingForResults && (
        <GameScreen
          seed={gameSeed}
          settings={gameSettings}
          profile={profile}
          roomId={roomId}
          onGameOver={handleGameOver}
          onBack={() => setView(isHostPlayer ? 'host-lobby' : 'player-lobby')}
        />
      )}

      {view === 'game' && waitingForResults && (
        <div className="waiting-screen">
          <div className="waiting-card">
            <h1 className="game-title">Joggle</h1>
            <div className="waiting-dots"><span /><span /><span /></div>
            <p className="waiting-text">Tallying results&hellip;</p>
          </div>
        </div>
      )}

      {view === 'phone-gameover' && profile && (
        <PhoneGameOver
          score={lastScore}
          words={lastWords}
          allResults={
            allResults.length > 0
              ? allResults
              : [{ id: profile.id, name: profile.name, avatar: profile.avatar, score: lastScore, words: lastWords }]
          }
          currentPlayerId={profile.id}
          isHost={isHostPlayer}
          onPlayAgain={handlePlayAgain}
          onBackToLobby={handleBackToLobby}
          onGoHome={() => setView('join')}
        />
      )}

      {showSettings && profile && (
        <Settings
          currentProfile={profile}
          onProfileChange={(p) => setProfile(p)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default App;
