# ✦ ЗНАКИ (Znaki) - Card Game Simulator

Welcome to the **Znaki Simulator**. This project is a browser-based, peer-to-peer (P2P) tool designed to simulate the card game "Znaki". It provides a virtual tabletop where players can manage their decks, cards, life crystals, and game state without needing an automated rules engine.

## 🚀 Tech Stack
- **React 19**: UI framework.
- **TypeScript**: For strong typing and reducing bugs.
- **Zustand**: A lightweight state management library (the "brain" of the game).
- **Tailwind CSS 4**: For styling and layout.
- **PeerJS**: Enables P2P communication via WebRTC (no game server required).
- **SheetJS (xlsx)**: Used for importing card data from Excel/CSV files.

---

## 📂 Project Structure

### 📁 `src/`
The main source folder containing all logic and UI.

#### 📄 `types.ts`
The "Dictionary" of the project. It defines exactly what a `Card`, `Player`, `Zone`, and `GameState` look like. If you want to add a new property to a card, you start here.

#### 📁 `store/`
Contains the global state of the game.
- **`gameStore.ts`**: The most important file. It contains all the game's data (whose turn it is, where cards are) and all the logic for moving cards, drawing, and synchronizing actions between players over the network.

#### 📁 `networking/`
Handles the "internet" part of the game.
- **`peer.ts`**: Manages the connection between two browsers using PeerJS. It handles sending and receiving messages (like "I just drew a card").

#### 📁 `components/`
The visual building blocks of the game.
- **`App.tsx`**: The entry point. Switches between the Lobby and the Game Board.
- **`Lobby.tsx`**: The main menu. Handles player naming, creating rooms (Hosting), and joining rooms (Guest).
- **`GameBoard.tsx`**: The main game screen. Arranges the fields, hands, and side panels.
- **`PlayerField.tsx`**: Renders the three main zones (Monsters, Spells/Artifacts, Signs) for a player.
- **`Hand.tsx`**: Renders the player's hand. Shows cards face-up for you and face-down for the opponent.
- **`LifeCrystals.tsx`**: Manages the health crystals and the "sealed" cards beneath them.
- **`Card.tsx`**: The visual representation of a single card.
- **`CardContextMenu.tsx`**: The menu that appears when you right-click a card.
- **`CardPreview.tsx`**: Shows detailed card info when you hover over it.
- **`ChainVisualizer.tsx`**: Visualizes the "Chain" of effects being resolved.
- **`TurnControls.tsx`**: Buttons to change phases and end turns.
- **`GameLog.tsx`**: The history of actions and the chat window.
- **`ImportDialog.tsx`**: The popup for importing card lists from files or Google Sheets.
- **`DeckBuilder.tsx`**: The tool used to select which cards go into a player's deck.

#### 📁 `utils/`
Helper functions.
- **`importCards.ts`**: Logic to read Excel/CSV files and convert them into `CardTemplate` objects the game understands.
- **`cn.ts`**: A tiny helper for combining Tailwind CSS classes.

---

## 🛠️ How it Works (Simplified)

1.  **State Management**: Instead of passing data between every single component, the game uses a **Store** (Zustand). Any component can "subscribe" to the store to get the latest game state or call a function to update it.
2.  **Networking**: When you move a card, the store updates your screen and then sends a small "action" message to your opponent via PeerJS. Your opponent's browser receives this message and runs the same store function to update their screen.
3.  **Data Flow**: 
    `User Input` $\rightarrow$ `Store Action` $\rightarrow$ `State Update` $\rightarrow$ `UI Re-render` $\rightarrow$ `Network Send` $\rightarrow$ `Opponent Store Action` $\rightarrow$ `Opponent UI Re-render`.
