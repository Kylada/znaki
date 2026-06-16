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
      // PeerJS UMD exposes window.peerjs.Peer or window.Peer
      const P = (window as any).Peer || ((window as any).peerjs && (window as any).peerjs.Peer);
      if (P) {
        resolve(P);
      } else {
        reject(new Error('PeerJS loaded but Peer class not found on window'));
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
  private messageQueue: PeerMessage[] = [];

  async init(customId?: string): Promise<string> {
    const PeerClass = await loadPeerJS();
    return new Promise((resolve, reject) => {
      try {
        this.peer = customId ? new PeerClass(customId) : new PeerClass();
        
        this.peer.on('open', (id: string) => {
          console.log('[Peer] Open with ID:', id);
          this.localId = id;
          resolve(id);
        });
        
        this.peer.on('connection', (conn: any) => {
          console.log('[Peer] Incoming connection from:', conn.peer);
          this.setupConnection(conn);
        });
        
        this.peer.on('error', (err: any) => {
          console.error('[Peer] Error:', err);
          reject(err);
        });

        // Timeout after 15 seconds
        setTimeout(() => {
          if (!this.localId) {
            reject(new Error('Timeout: не удалось подключиться к серверу PeerJS'));
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
        reject(new Error('Peer not initialized')); 
        return; 
      }
      
      console.log('[Peer] Connecting to:', remoteId);
      const conn = this.peer.connect(remoteId, { reliable: true });
      
      if (!conn) {
        reject(new Error('Failed to create connection'));
        return;
      }

      conn.on('open', () => {
        console.log('[Peer] Connection opened to:', remoteId);
        this.setupConnection(conn);
        resolve();
      });
      
      conn.on('error', (err: any) => {
        console.error('[Peer] Connection error:', err);
        reject(err);
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!this.connection) {
          reject(new Error('Timeout: не удалось подключиться к оппоненту. Проверьте ID.'));
        }
      }, 15000);
    });
  }

  private setupConnection(conn: any) {
    this.connection = conn;
    console.log('[Peer] Setup connection with:', conn.peer);
    
    conn.on('data', (data: any) => {
      console.log('[Peer] Received data:', data?.type);
      if (this.onMessage) {
        this.onMessage(data as PeerMessage);
      } else {
        // Queue messages that arrive before onMessage is set
        console.log('[Peer] Queuing message (no handler yet):', data?.type);
        this.messageQueue.push(data as PeerMessage);
      }
    });
    
    conn.on('close', () => {
      console.log('[Peer] Connection closed');
      this.connection = null;
      if (this.onDisconnected) this.onDisconnected();
    });
    
    conn.on('error', (err: any) => {
      console.error('[Peer] Data connection error:', err);
    });
    
    if (this.onConnected) {
      this.onConnected(conn.peer);
    }
  }

  // Call this after setting onMessage to flush any queued messages
  flushMessageQueue() {
    if (this.onMessage && this.messageQueue.length > 0) {
      console.log('[Peer] Flushing', this.messageQueue.length, 'queued messages');
      const queue = [...this.messageQueue];
      this.messageQueue = [];
      for (const msg of queue) {
        this.onMessage(msg);
      }
    }
  }

  send(msg: PeerMessage) {
    if (this.connection && this.connection.open) {
      console.log('[Peer] Sending:', msg.type);
      this.connection.send(msg);
    } else {
      console.warn('[Peer] Cannot send, connection not open');
    }
  }

  disconnect() {
    if (this.connection) this.connection.close();
    if (this.peer) this.peer.destroy();
    this.connection = null;
    this.peer = null;
    this.messageQueue = [];
  }
}

export const networkManager = new NetworkManager();
