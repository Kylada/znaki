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
      if ((window as any).Peer) {
        resolve((window as any).Peer);
      } else {
        reject(new Error('PeerJS failed to load'));
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

  async init(customId?: string): Promise<string> {
    const PeerClass = await loadPeerJS();
    return new Promise((resolve, reject) => {
      try {
        this.peer = customId ? new PeerClass(customId) : new PeerClass();
        this.peer.on('open', (id: string) => {
          this.localId = id;
          resolve(id);
        });
        this.peer.on('connection', (conn: any) => {
          this.setupConnection(conn);
        });
        this.peer.on('error', (err: any) => {
          console.error('Peer error:', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  connect(remoteId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peer) { reject('Peer not initialized'); return; }
      const conn = this.peer.connect(remoteId, { reliable: true });
      conn.on('open', () => {
        this.setupConnection(conn);
        resolve();
      });
      conn.on('error', reject);
    });
  }

  private setupConnection(conn: any) {
    this.connection = conn;
    conn.on('data', (data: any) => {
      if (this.onMessage) {
        this.onMessage(data as PeerMessage);
      }
    });
    conn.on('close', () => {
      this.connection = null;
      if (this.onDisconnected) this.onDisconnected();
    });
    if (this.onConnected) this.onConnected(conn.peer);
  }

  send(msg: PeerMessage) {
    if (this.connection && this.connection.open) {
      this.connection.send(msg);
    }
  }

  disconnect() {
    if (this.connection) this.connection.close();
    if (this.peer) this.peer.destroy();
  }
}

export const networkManager = new NetworkManager();
