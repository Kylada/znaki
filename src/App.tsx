import React, { useState } from 'react';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';

/**
 * ErrorBoundary is a special React component that catches JavaScript errors anywhere 
 * in their child component tree. Instead of the whole app crashing and showing 
 * a white screen, it displays a friendly error message.
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  
  // This lifecycle method updates state so the next render shows the fallback UI
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message + '\n' + error.stack };
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#ff6b6b', background: '#111', minHeight: '100vh', fontFamily: 'monospace' }}>
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

/**
 * The Root App Component
 * This is the entry point of the UI. It simply decides whether to show 
 * the main menu (Lobby) or the actual game (GameBoard).
 */
function App() {
  // Local state to track if we have transitioned from the menu to the game
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <ErrorBoundary>
      {gameStarted ? (
        <GameBoard />
      ) : (
        // Pass a function to Lobby so it can notify App when the 'Start' button is clicked
        <Lobby onGameStart={() => setGameStarted(true)} />
      )}
    </ErrorBoundary>
  );
}

export default App;
