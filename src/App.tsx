import React, { useState } from 'react';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message + '\n' + error.stack };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#ff6b6b', background: '#111', minHeight: '100dvh', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>⚠️ Ошибка приложения</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#ccc' }}>{this.state.error}</pre>
          <button
            style={{ marginTop: 20, padding: '10px 24px', background: '#333', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            onClick={() => window.location.reload()}
          >
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <ErrorBoundary>
      {gameStarted ? (
        <GameBoard />
      ) : (
        <Lobby onGameStart={() => setGameStarted(true)} />
      )}
    </ErrorBoundary>
  );
}

export default App;
