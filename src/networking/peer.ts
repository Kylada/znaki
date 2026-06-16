import type { PeerMessage } from '../types';

function loadPeerJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).Peer) {
      resolve((window as any).Peer);
      return;
    }
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

export class NetworkManager {
  peer: any = null;
  connection: any = null;
  onMessage: ((msg: PeerMessage) => void) | null = null;
  onConnected: ((remoteId: string) => void) | null = null;
  onDisconnected: (() => void) | null = null;
  localId: string = '';

  async init(): Promise<string> {
    const PeerClass = await loadPeerJS();
    return new Promise((resolve, reject) => {
      try {
        this.peer = new PeerClass();

        this.peer.on('open', (id: string) => {
          console.log('[Peer] Connected to signaling server, ID:', id);
          this.localId = id;
          resolve(id);
        });

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

      conn.on('open', () => {
        console.log('[Peer] Data channel OPEN with:', remoteId);
        this.setupConnection(conn);
        resolve();
      });

      conn.on('error', (err: any) => {
        console.error('[Peer] Connection error:', err);
        reject(new Error(err.message || 'Ошибка соединения'));
      });

      setTimeout(() => {
        if (!this.connection) {
          reject(new Error('Таймаут соединения с оппонентом (15с). Проверьте ID.'));
        }
      }, 15000);
    });
  }

  private setupConnection(conn: any) {
    this.connection = conn;
    console.log('[Peer] setupConnection, peer:', conn.peer, 'open:', conn.open);

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

  send(msg: PeerMessage): boolean {
    if (this.connection && this.connection.open) {
      console.log('[Peer] Sending:', msg.type);
      this.connection.send(msg);
      return true;
    }
    console.warn('[Peer] Cannot send — connection not open');
    return false;
  }

  disconnect() {
    if (this.connection) this.connection.close();
    if (this.peer) this.peer.destroy();
    this.connection = null;
    this.peer = null;
  }
}

export const networkManager = new NetworkManager();
