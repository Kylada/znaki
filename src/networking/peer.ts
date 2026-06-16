import Peer from 'peerjs';
import type { PeerMessage } from '../types';

export class NetworkManager {
  peer: Peer | null = null;
  connection: any = null;
  onMessage: ((msg: PeerMessage) => void) | null = null;
  onConnected: ((remoteId: string) => void) | null = null;
  onDisconnected: (() => void) | null = null;
  localId: string = '';

  async init(customId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.peer = customId ? new Peer(customId) : new Peer();
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
