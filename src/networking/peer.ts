import type { PeerMessage } from '../types';

/**
 * PeerJS is a library that simplifies WebRTC (Peer-to-Peer) connections.
 * Since PeerJS is a global browser library, we load it dynamically via a <script> tag
 * to avoid bundling issues and ensure we use the latest CDN version.
 */
function loadPeerJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Check if Peer is already available globally
    if ((window as any).Peer) {
      resolve((window as any).Peer);
      return;
    }
    
    // Create a script element to load PeerJS from the CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    
    script.onload = () => {
      const P = (window as any).Peer;
      if (P) {
        resolve(P);
      } else {
        reject(new Error('PeerJS loaded but Peer class not found'));
      }
    };
    
    script.onerror = () => reject(new Error('Failed to load PeerJS from CDN'));
    document.head.appendChild(script);
  });
}

/**
 * NetworkManager handles the low-level connection between two players.
 * It manages the PeerJS object, the data connection, and event callbacks.
 */
export class NetworkManager {
  peer: any = null;       // The PeerJS instance
  connection: any = null; // The active data connection to the opponent
  
  // Callbacks that the UI/Store can set to react to network events
  onMessage: ((msg: PeerMessage) => void) | null = null;
  onConnected: ((remoteId: string) => void) | null = null;
  onDisconnected: (() => void) | null = null;
  
  localId: string = '';   // The unique ID assigned to this player by the signaling server

  /**
   * Initializes the PeerJS instance and connects to the signaling server.
   * Returns the unique ID of this peer.
   */
  async init(): Promise<string> {
    const PeerClass = await loadPeerJS();
    return new Promise((resolve, reject) => {
      try {
        this.peer = new PeerClass();

        // 'open' is fired when the Peer is connected to the signaling server and has an ID
        this.peer.on('open', (id: string) => {
          console.log('[Peer] Connected to signaling server, ID:', id);
          this.localId = id;
          resolve(id);
        });

        // 'connection' is fired when another peer tries to connect to us (Guest -> Host)
        this.peer.on('connection', (conn: any) => {
          console.log('[Peer] Incoming connection from:', conn.peer);
          this.setupConnection(conn);
        });

        this.peer.on('error', (err: any) => {
          console.error('[Peer] Error:', err.type, err.message || err);
          reject(new Error(err.message || String(err)));
        });

        this.peer.on('disconnected', () => {
          console.log('[Peer] Disconnected from signaling server');
        });

        // Safety timeout: if the signaling server doesn't respond in 15s, fail.
        setTimeout(() => {
          if (!this.localId) {
            reject(new Error('Таймаут подключения к серверу PeerJS (15с)'));
          }
        }, 15000);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Initiates a connection to a remote peer using their ID.
   * This is typically called by the "Guest" player.
   */
  connect(remoteId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error('Peer не инициализирован'));
        return;
      }

      console.log('[Peer] Initiating connection to:', remoteId);
      const conn = this.peer.connect(remoteId, { reliable: true });

      if (!conn) {
        reject(new Error('Не удалось создать соединение'));
        return;
      }

      // 'open' is fired when the data channel between the two browsers is established
      conn.on('open', () => {
        console.log('[Peer] Data channel OPEN with:', remoteId);
        this.setupConnection(conn);
        resolve();
      });

      conn.on('error', (err: any) => {
        console.error('[Peer] Connection error:', err);
        reject(new Error(err.message || 'Ошибка соединения'));
      });

      // Safety timeout for the data channel connection
      setTimeout(() => {
        if (!this.connection) {
          reject(new Error('Таймаут соединения с оппонентом (15с). Проверьте ID.'));
        }
      }, 15000);
    });
  }

  /**
   * Internal method to configure the data channel listeners.
   */
  private setupConnection(conn: any) {
    this.connection = conn;
    console.log('[Peer] setupConnection, peer:', conn.peer, 'open:', conn.open);

    // Triggered whenever the opponent sends a message
    conn.on('data', (data: any) => {
      console.log('[Peer] Received:', data?.type || 'unknown');
      if (this.onMessage) {
        this.onMessage(data as PeerMessage);
      }
    });

    conn.on('close', () => {
      console.log('[Peer] Connection closed');
      this.connection = null;
      if (this.onDisconnected) this.onDisconnected();
    });

    conn.on('error', (err: any) => {
      console.error('[Peer] Data channel error:', err);
    });

    if (this.onConnected) {
      this.onConnected(conn.peer);
    }
  }

  /**
   * Sends a message to the connected peer.
   * @returns true if the message was sent, false otherwise.
   */
  send(msg: PeerMessage): boolean {
    if (this.connection && this.connection.open) {
      console.log('[Peer] Sending:', msg.type);
      this.connection.send(msg);
      return true;
    }
    console.warn('[Peer] Cannot send — connection not open');
    return false;
  }

  /**
   * Fully shuts down the PeerJS instance and closes connections.
   */
  disconnect() {
    if (this.connection) this.connection.close();
    if (this.peer) this.peer.destroy();
    this.connection = null;
    this.peer = null;
  }
}

// Export a single instance of the manager to be used across the whole app
export const networkManager = new NetworkManager();
