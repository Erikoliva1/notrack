/**
 * Socket.io Integration Test Suite
 * 
 * Tests the complete end-to-end flow of WebRTC signaling:
 * - Two clients connecting to the server
 * - Extension assignment
 * - Call initiation and answer
 * - ICE candidate exchange
 * - Call termination
 */

import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import { AddressInfo } from 'net';

describe('Socket.io Integration Tests - Complete Call Flow', () => {
  let io: Server;
  let httpServer: any;
  let clientA: ClientSocket;
  let clientB: ClientSocket;
  let serverPort: number;
  
  let clientAExtension: string;
  let clientBExtension: string;

  // In-memory storage (simulating server state)
  const extensionToSocketMap = new Map<string, string>();
  const socketToExtensionMap = new Map<string, string>();

  /**
   * Generate unique extension number
   */
  function generateExtensionNumber(): string {
    let extensionNumber: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      const num1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const num2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      extensionNumber = `${num1}-${num2}`;
      attempts++;

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique extension number');
      }
    } while (extensionToSocketMap.has(extensionNumber));

    return extensionNumber;
  }

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Set up server logic
    io.on('connection', (socket) => {
      // Assign extension
      const extensionNumber = generateExtensionNumber();
      extensionToSocketMap.set(extensionNumber, socket.id);
      socketToExtensionMap.set(socket.id, extensionNumber);
      
      socket.emit('extension-assigned', { extensionNumber });

      // Handle call-user
      socket.on('call-user', (data: { targetExtension: string; offer: any }) => {
        const targetSocketId = extensionToSocketMap.get(data.targetExtension);
        if (!targetSocketId) {
          socket.emit('call-failed', { message: 'User not found or offline' });
        } else {
          const callerExtension = socketToExtensionMap.get(socket.id);
          io.to(targetSocketId).emit('incoming-call', {
            callerExtension,
            offer: data.offer
          });
        }
      });

      // Handle answer-call
      socket.on('answer-call', (data: { callerExtension: string; answer: any }) => {
        const callerSocketId = extensionToSocketMap.get(data.callerExtension);
        if (callerSocketId) {
          const calleeExtension = socketToExtensionMap.get(socket.id);
          io.to(callerSocketId).emit('call-answered', {
            calleeExtension,
            answer: data.answer
          });
        }
      });

      // Handle ice-candidate
      socket.on('ice-candidate', (data: { targetExtension: string; candidate: any }) => {
        const targetSocketId = extensionToSocketMap.get(data.targetExtension);
        if (targetSocketId) {
          const senderExtension = socketToExtensionMap.get(socket.id);
          io.to(targetSocketId).emit('ice-candidate', {
            senderExtension,
            candidate: data.candidate
          });
        }
      });

      // Handle hangup
      socket.on('hangup', (data: { targetNumber: string }) => {
        const targetSocketId = extensionToSocketMap.get(data.targetNumber);
        if (targetSocketId) {
          const callerExtension = socketToExtensionMap.get(socket.id);
          io.to(targetSocketId).emit('hangup', { from: callerExtension });
        }
      });

      // Handle reject
      socket.on('reject', (data: { callerExtension: string }) => {
        const callerSocketId = extensionToSocketMap.get(data.callerExtension);
        if (callerSocketId) {
          io.to(callerSocketId).emit('call-failed', { message: 'Call rejected by user' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        const extensionNumber = socketToExtensionMap.get(socket.id);
        if (extensionNumber) {
          extensionToSocketMap.delete(extensionNumber);
        }
        socketToExtensionMap.delete(socket.id);
      });
    });
    
    httpServer.listen(0, () => {
      serverPort = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll((done) => {
    extensionToSocketMap.clear();
    socketToExtensionMap.clear();
    io.close();
    httpServer.close(done);
  });

  beforeEach((done) => {
    let clientAConnected = false;
    let clientBConnected = false;

    clientA = Client(`http://localhost:${serverPort}`);
    clientB = Client(`http://localhost:${serverPort}`);

    clientA.on('extension-assigned', (data) => {
      clientAExtension = data.extensionNumber;
      clientAConnected = true;
      if (clientAConnected && clientBConnected) {
        done();
      }
    });

    clientB.on('extension-assigned', (data) => {
      clientBExtension = data.extensionNumber;
      clientBConnected = true;
      if (clientAConnected && clientBConnected) {
        done();
      }
    });
  });

  afterEach(() => {
    if (clientA.connected) clientA.disconnect();
    if (clientB.connected) clientB.disconnect();
  });

  describe('Connection and Extension Assignment', () => {
    test('both clients should connect successfully', () => {
      expect(clientA.connected).toBe(true);
      expect(clientB.connected).toBe(true);
    });

    test('both clients should receive unique extension numbers', () => {
      expect(clientAExtension).toBeDefined();
      expect(clientBExtension).toBeDefined();
      expect(clientAExtension).not.toBe(clientBExtension);
      expect(clientAExtension).toMatch(/^\d{3}-\d{3}$/);
      expect(clientBExtension).toMatch(/^\d{3}-\d{3}$/);
    });
  });

  describe('Complete Call Flow: Client A calls Client B', () => {
    test('should complete full call initiation flow', (done) => {
      const mockOffer = {
        type: 'offer',
        sdp: 'mock-sdp-offer-data'
      };

      // Client B listens for incoming call
      clientB.on('incoming-call', (data) => {
        expect(data.callerExtension).toBe(clientAExtension);
        expect(data.offer).toEqual(mockOffer);
        done();
      });

      // Client A initiates call to Client B
      clientA.emit('call-user', {
        targetExtension: clientBExtension,
        offer: mockOffer
      });
    });

    test('should complete full call answer flow', (done) => {
      const mockOffer = {
        type: 'offer',
        sdp: 'mock-offer-sdp'
      };

      const mockAnswer = {
        type: 'answer',
        sdp: 'mock-answer-sdp'
      };

      let callReceived = false;

      // Step 1: Client B receives incoming call
      clientB.on('incoming-call', (data) => {
        expect(data.callerExtension).toBe(clientAExtension);
        callReceived = true;

        // Step 2: Client B answers the call
        clientB.emit('answer-call', {
          callerExtension: clientAExtension,
          answer: mockAnswer
        });
      });

      // Step 3: Client A receives the answer
      clientA.on('call-answered', (data) => {
        expect(callReceived).toBe(true);
        expect(data.calleeExtension).toBe(clientBExtension);
        expect(data.answer).toEqual(mockAnswer);
        done();
      });

      // Start the call
      clientA.emit('call-user', {
        targetExtension: clientBExtension,
        offer: mockOffer
      });
    });
  });

  describe('ICE Candidate Exchange', () => {
    test('should exchange ICE candidates between Client A and Client B', (done) => {
      const mockCandidateFromA = {
        candidate: 'ice-candidate-from-A',
        sdpMid: '0',
        sdpMLineIndex: 0
      };

      const mockCandidateFromB = {
        candidate: 'ice-candidate-from-B',
        sdpMid: '0',
        sdpMLineIndex: 0
      };

      let candidatesExchanged = 0;

      // Client B receives ICE candidate from Client A
      clientB.on('ice-candidate', (data) => {
        expect(data.senderExtension).toBe(clientAExtension);
        expect(data.candidate).toEqual(mockCandidateFromA);
        candidatesExchanged++;

        // Client B sends ICE candidate to Client A
        clientB.emit('ice-candidate', {
          targetExtension: clientAExtension,
          candidate: mockCandidateFromB
        });
      });

      // Client A receives ICE candidate from Client B
      clientA.on('ice-candidate', (data) => {
        expect(data.senderExtension).toBe(clientBExtension);
        expect(data.candidate).toEqual(mockCandidateFromB);
        candidatesExchanged++;

        if (candidatesExchanged === 2) {
          done();
        }
      });

      // Client A sends ICE candidate to Client B
      clientA.emit('ice-candidate', {
        targetExtension: clientBExtension,
        candidate: mockCandidateFromA
      });
    });

    test('should handle multiple ICE candidates from same client', (done) => {
      const candidates = [
        { candidate: 'candidate-1', sdpMid: '0', sdpMLineIndex: 0 },
        { candidate: 'candidate-2', sdpMid: '0', sdpMLineIndex: 1 },
        { candidate: 'candidate-3', sdpMid: '0', sdpMLineIndex: 2 }
      ];

      let receivedCount = 0;

      clientB.on('ice-candidate', (data) => {
        expect(data.senderExtension).toBe(clientAExtension);
        receivedCount++;

        if (receivedCount === candidates.length) {
          done();
        }
      });

      // Send multiple candidates
      candidates.forEach(candidate => {
        clientA.emit('ice-candidate', {
          targetExtension: clientBExtension,
          candidate
        });
      });
    });
  });

  describe('Call Termination', () => {
    test('should handle hangup from Client A', (done) => {
      clientB.on('hangup', (data) => {
        expect(data.from).toBe(clientAExtension);
        done();
      });

      clientA.emit('hangup', {
        targetNumber: clientBExtension
      });
    });

    test('should handle call rejection from Client B', (done) => {
      const mockOffer = {
        type: 'offer',
        sdp: 'mock-offer-sdp'
      };

      // Client A listens for rejection
      clientA.on('call-failed', (data) => {
        expect(data.message).toContain('rejected');
        done();
      });

      // Client B receives and rejects the call
      clientB.on('incoming-call', (data) => {
        // Reject the call
        clientB.emit('reject', {
          callerExtension: data.callerExtension
        });
      });

      // Client A initiates call
      clientA.emit('call-user', {
        targetExtension: clientBExtension,
        offer: mockOffer
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle call to non-existent extension', (done) => {
      const nonExistentExtension = '999-999';

      clientA.on('call-failed', (data) => {
        expect(data.message).toContain('not found');
        done();
      });

      clientA.emit('call-user', {
        targetExtension: nonExistentExtension,
        offer: { type: 'offer', sdp: 'mock' }
      });
    });

    test('should handle disconnection during call', (done) => {
      // Client A initiates call
      clientA.emit('call-user', {
        targetExtension: clientBExtension,
        offer: { type: 'offer', sdp: 'mock' }
      });

      // Client B receives call and then disconnects
      clientB.on('incoming-call', () => {
        clientB.disconnect();

        setTimeout(() => {
          // Try to send something to disconnected client
          clientA.emit('ice-candidate', {
            targetExtension: clientBExtension,
            candidate: { candidate: 'test' }
          });

          // Should not crash, just fail silently
          setTimeout(done, 100);
        }, 50);
      });
    });
  });

  describe('Multiple Simultaneous Calls', () => {
    test('should handle multiple clients connecting', (done) => {
      const clientC = Client(`http://localhost:${serverPort}`);
      const clientD = Client(`http://localhost:${serverPort}`);
      
      // Start with existing extensions
      let assignedExtensions: string[] = [clientAExtension, clientBExtension];
      let clientCExtension: string;
      let clientDExtension: string;

      let connectionsComplete = 0;

      const checkComplete = () => {
        if (connectionsComplete === 2) {
          assignedExtensions.push(clientCExtension, clientDExtension);
          const uniqueExtensions = new Set(assignedExtensions);
          expect(uniqueExtensions.size).toBe(4);
          clientC.disconnect();
          clientD.disconnect();
          done();
        }
      };

      clientC.on('extension-assigned', (data) => {
        clientCExtension = data.extensionNumber;
        connectionsComplete++;
        checkComplete();
      });

      clientD.on('extension-assigned', (data) => {
        clientDExtension = data.extensionNumber;
        connectionsComplete++;
        checkComplete();
      });
    });
  });

  describe('Complex Call Scenarios', () => {
    test('should complete full call lifecycle: initiate -> answer -> ICE exchange -> hangup', (done) => {
      const mockOffer = { type: 'offer', sdp: 'mock-offer' };
      const mockAnswer = { type: 'answer', sdp: 'mock-answer' };
      const mockCandidate = { candidate: 'mock-candidate' };

      let callAnswered = false;
      let iceExchanged = false;

      // Phase 1: Call initiation and answer
      clientB.on('incoming-call', (data) => {
        expect(data.callerExtension).toBe(clientAExtension);
        
        // Answer the call
        clientB.emit('answer-call', {
          callerExtension: clientAExtension,
          answer: mockAnswer
        });
      });

      clientA.on('call-answered', (data) => {
        expect(data.calleeExtension).toBe(clientBExtension);
        callAnswered = true;

        // Phase 2: Exchange ICE candidates
        clientA.emit('ice-candidate', {
          targetExtension: clientBExtension,
          candidate: mockCandidate
        });
      });

      clientB.on('ice-candidate', (data) => {
        expect(callAnswered).toBe(true);
        expect(data.senderExtension).toBe(clientAExtension);
        iceExchanged = true;

        // Phase 3: Hangup
        clientA.emit('hangup', {
          targetNumber: clientBExtension
        });
      });

      clientB.on('hangup', (data) => {
        expect(iceExchanged).toBe(true);
        expect(data.from).toBe(clientAExtension);
        done();
      });

      // Start the call
      clientA.emit('call-user', {
        targetExtension: clientBExtension,
        offer: mockOffer
      });
    });
  });
});

/**
 * Test Coverage Summary:
 * ✅ Client connection and extension assignment
 * ✅ Unique extension generation for multiple clients
 * ✅ Complete call initiation flow (A → B)
 * ✅ Complete call answer flow (B → A)
 * ✅ ICE candidate exchange (bidirectional)
 * ✅ Multiple ICE candidates handling
 * ✅ Call hangup
 * ✅ Call rejection
 * ✅ Error handling for non-existent extensions
 * ✅ Error handling for client disconnection
 * ✅ Multiple simultaneous clients
 * ✅ Complete call lifecycle (initiate → answer → ICE → hangup)
 */
