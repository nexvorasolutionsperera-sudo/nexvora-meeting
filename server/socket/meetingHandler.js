const { readDb, writeDb } = require('../db');

// In-memory active rooms data structure
// rooms[meetingId] = {
//   id,
//   hostId,
//   coHosts: Set(),
//   isLocked: false,
//   waitingRoomEnabled: false,
//   permissions: { allowScreenShare: true, allowChat: true, allowUnmute: true },
//   participants: Map(socketId -> { socketId, userId, name, avatar, isHost, isCoHost, audioEnabled, videoEnabled, screenSharing, handRaised }),
//   waitingList: Map(socketId -> { socketId, userId, name, avatar, joinedAt }),
//   messages: []
// }

const rooms = new Map();

function getOrCreateRoom(meetingId, dbMeeting, hostUser) {
  if (!rooms.has(meetingId)) {
    rooms.set(meetingId, {
      id: meetingId,
      title: dbMeeting ? dbMeeting.title : `Meeting ${meetingId}`,
      hostId: dbMeeting ? dbMeeting.hostId : (hostUser ? hostUser.id : null),
      coHosts: new Set(),
      isLocked: dbMeeting ? !!dbMeeting.isLocked : false,
      waitingRoomEnabled: dbMeeting ? !!dbMeeting.waitingRoomEnabled : false,
      permissions: {
        allowScreenShare: dbMeeting ? dbMeeting.allowScreenShare !== false : true,
        allowChat: dbMeeting ? dbMeeting.allowChat !== false : true,
        allowUnmute: true
      },
      participants: new Map(),
      waitingList: new Map(),
      messages: []
    });
  }
  return rooms.get(meetingId);
}

function setupMeetingSocket(io) {
  io.on('connection', (socket) => {
    let currentMeetingId = null;
    let currentUser = null;

    // Helper to get sanitized participants array
    const getParticipantsArray = (room) => {
      return Array.from(room.participants.values()).map(p => ({
        socketId: p.socketId,
        userId: p.userId,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        isCoHost: p.isCoHost,
        audioEnabled: p.audioEnabled,
        videoEnabled: p.videoEnabled,
        screenSharing: p.screenSharing,
        handRaised: p.handRaised
      }));
    };

    const getWaitingListArray = (room) => {
      return Array.from(room.waitingList.values());
    };

    // Join Request
    socket.on('join-room', ({ meetingId, user, initialSettings }) => {
      currentMeetingId = meetingId;
      currentUser = user;

      const db = readDb();
      const dbMeeting = db.meetings.find(m => m.id === meetingId);
      const room = getOrCreateRoom(meetingId, dbMeeting, user);

      // Determine if this user is the Host
      const isHost = (dbMeeting && dbMeeting.hostId === user.id) || 
                     (!dbMeeting && room.participants.size === 0);

      // Check if meeting is locked
      if (room.isLocked && !isHost && !room.coHosts.has(user.id)) {
        return socket.emit('join-error', { message: 'This meeting is locked by the host.' });
      }

      // Check waiting room: if enabled and not host/co-host, put in waiting list
      if (room.waitingRoomEnabled && !isHost && !room.coHosts.has(user.id)) {
        room.waitingList.set(socket.id, {
          socketId: socket.id,
          userId: user.id,
          name: user.name,
          avatar: user.avatar,
          joinedAt: new Date().toLocaleTimeString()
        });

        socket.emit('waiting-room-status', {
          inWaitingRoom: true,
          message: 'Please wait, the meeting host will let you in soon.'
        });

        // Notify host & co-hosts of waiting list change
        io.to(`meeting_${meetingId}_hosts`).emit('waiting-list-update', getWaitingListArray(room));
        return;
      }

      // Join the active room
      completeUserJoin(room, isHost, initialSettings);
    });

    function completeUserJoin(room, isHost, initialSettings = {}) {
      const isCoHost = room.coHosts.has(currentUser.id);

      const participant = {
        socketId: socket.id,
        userId: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        isHost: isHost,
        isCoHost: isCoHost,
        audioEnabled: initialSettings.audioEnabled !== undefined ? initialSettings.audioEnabled : true,
        videoEnabled: initialSettings.videoEnabled !== undefined ? initialSettings.videoEnabled : true,
        screenSharing: false,
        handRaised: false
      };

      room.participants.set(socket.id, participant);
      socket.join(`meeting_${room.id}`);

      if (isHost || isCoHost) {
        socket.join(`meeting_${room.id}_hosts`);
      }

      // Send room state to the newly joined participant
      socket.emit('room-joined', {
        meetingId: room.id,
        title: room.title,
        isHost: participant.isHost,
        isCoHost: participant.isCoHost,
        isLocked: room.isLocked,
        waitingRoomEnabled: room.waitingRoomEnabled,
        permissions: room.permissions,
        participants: getParticipantsArray(room),
        waitingList: (isHost || isCoHost) ? getWaitingListArray(room) : [],
        messages: room.messages.slice(-50)
      });

      // Broadcast new participant to other peers in room
      socket.to(`meeting_${room.id}`).emit('participant-joined', participant);

      // If host, also send current waiting list
      if (isHost || isCoHost) {
        socket.emit('waiting-list-update', getWaitingListArray(room));
      }
    }

    // WebRTC Signaling
    socket.on('signal-offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('signal-offer', {
        senderSocketId: socket.id,
        offer
      });
    });

    socket.on('signal-answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('signal-answer', {
        senderSocketId: socket.id,
        answer
      });
    });

    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('ice-candidate', {
        senderSocketId: socket.id,
        candidate
      });
    });

    // Media State Changes
    socket.on('toggle-audio', ({ enabled }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (room && room.participants.has(socket.id)) {
        room.participants.get(socket.id).audioEnabled = enabled;
        io.to(`meeting_${currentMeetingId}`).emit('participant-audio-change', {
          socketId: socket.id,
          enabled
        });
      }
    });

    socket.on('toggle-video', ({ enabled }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (room && room.participants.has(socket.id)) {
        room.participants.get(socket.id).videoEnabled = enabled;
        io.to(`meeting_${currentMeetingId}`).emit('participant-video-change', {
          socketId: socket.id,
          enabled
        });
      }
    });

    socket.on('toggle-screen-share', ({ enabled }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (room && room.participants.has(socket.id)) {
        room.participants.get(socket.id).screenSharing = enabled;
        io.to(`meeting_${currentMeetingId}`).emit('participant-screen-change', {
          socketId: socket.id,
          enabled
        });
      }
    });

    // Active Speaker Detection
    socket.on('participant-speaking', ({ isSpeaking }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (room && room.participants.has(socket.id)) {
        room.participants.get(socket.id).isSpeaking = isSpeaking;
        io.to(`meeting_${currentMeetingId}`).emit('participant-speaking-change', {
          socketId: socket.id,
          name: room.participants.get(socket.id).name,
          isSpeaking
        });
      }
    });

    // Raise / Lower Hand
    socket.on('toggle-hand', ({ raised }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (room && room.participants.has(socket.id)) {
        room.participants.get(socket.id).handRaised = raised;
        io.to(`meeting_${currentMeetingId}`).emit('participant-hand-change', {
          socketId: socket.id,
          participantName: room.participants.get(socket.id).name,
          raised
        });
      }
    });

    // Emoji Reaction
    socket.on('send-reaction', ({ emoji }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (room && room.participants.has(socket.id)) {
        const participant = room.participants.get(socket.id);
        io.to(`meeting_${currentMeetingId}`).emit('new-reaction', {
          id: Math.random().toString(36).substring(7),
          emoji,
          senderName: participant.name,
          senderSocketId: socket.id
        });
      }
    });

    // Chat Message
    socket.on('send-chat', ({ text, targetSocketId = null, isDirect = false }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room || !room.participants.has(socket.id)) return;

      const sender = room.participants.get(socket.id);

      // Check if chat is permitted
      if (!room.permissions.allowChat && !sender.isHost && !sender.isCoHost) {
        return socket.emit('chat-error', { message: 'Chat has been disabled by the host.' });
      }

      const msg = {
        id: Math.random().toString(36).substring(7),
        senderSocketId: socket.id,
        senderId: sender.userId,
        senderName: sender.name,
        senderAvatar: sender.avatar,
        text,
        isDirect,
        targetSocketId,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      if (isDirect && targetSocketId) {
        // Direct message
        io.to(targetSocketId).emit('new-chat-message', msg);
        socket.emit('new-chat-message', msg);
      } else {
        // Public message
        room.messages.push(msg);
        if (room.messages.length > 100) room.messages.shift();
        io.to(`meeting_${currentMeetingId}`).emit('new-chat-message', msg);
      }
    });

    // Host Waiting Room Controls: Admit
    socket.on('admit-participant', ({ socketId }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;

      const requester = room.participants.get(socket.id);
      if (!requester || (!requester.isHost && !requester.isCoHost)) return;

      const waitingUser = room.waitingList.get(socketId);
      if (waitingUser) {
        room.waitingList.delete(socketId);
        io.to(`meeting_${currentMeetingId}_hosts`).emit('waiting-list-update', getWaitingListArray(room));

        // Signal user that they were admitted
        io.to(socketId).emit('admitted-to-meeting');
      }
    });

    // Host Waiting Room Controls: Admit All
    socket.on('admit-all', () => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;

      const requester = room.participants.get(socket.id);
      if (!requester || (!requester.isHost && !requester.isCoHost)) return;

      room.waitingList.forEach((_, waitingSocketId) => {
        io.to(waitingSocketId).emit('admitted-to-meeting');
      });
      room.waitingList.clear();
      io.to(`meeting_${currentMeetingId}_hosts`).emit('waiting-list-update', []);
    });

    // Host Waiting Room Controls: Deny
    socket.on('deny-participant', ({ socketId }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;

      const requester = room.participants.get(socket.id);
      if (!requester || (!requester.isHost && !requester.isCoHost)) return;

      if (room.waitingList.has(socketId)) {
        room.waitingList.delete(socketId);
        io.to(socketId).emit('denied-entry', { message: 'The host has denied your request to join the meeting.' });
        io.to(`meeting_${currentMeetingId}_hosts`).emit('waiting-list-update', getWaitingListArray(room));
      }
    });

    // Host Moderation: Mute Individual Participant
    socket.on('mute-participant', ({ targetSocketId }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;

      const requester = room.participants.get(socket.id);
      if (!requester || (!requester.isHost && !requester.isCoHost)) return;

      const target = room.participants.get(targetSocketId);
      if (target) {
        target.audioEnabled = false;
        io.to(targetSocketId).emit('force-mute');
        io.to(`meeting_${currentMeetingId}`).emit('participant-audio-change', {
          socketId: targetSocketId,
          enabled: false
        });
      }
    });

    // Host Moderation: Stop Video of Individual Participant
    socket.on('stop-video-participant', ({ targetSocketId }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;

      const requester = room.participants.get(socket.id);
      if (!requester || (!requester.isHost && !requester.isCoHost)) return;

      const target = room.participants.get(targetSocketId);
      if (target) {
        target.videoEnabled = false;
        io.to(targetSocketId).emit('force-stop-video');
        io.to(`meeting_${currentMeetingId}`).emit('participant-video-change', {
          socketId: targetSocketId,
          enabled: false
        });
      }
    });

    // Host Moderation: Mute All
    socket.on('mute-all', () => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;

      const requester = room.participants.get(socket.id);
      if (!requester || (!requester.isHost && !requester.isCoHost)) return;

      room.participants.forEach((p, pSocketId) => {
        if (pSocketId !== socket.id) {
          p.audioEnabled = false;
          io.to(pSocketId).emit('force-mute');
        }
      });

      io.to(`meeting_${currentMeetingId}`).emit('all-muted', {
        by: requester.name
      });
    });

    // Host Moderation: Remove Participant
    socket.on('remove-participant', ({ targetSocketId }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;

      const requester = room.participants.get(socket.id);
      if (!requester || (!requester.isHost && !requester.isCoHost)) return;

      if (room.participants.has(targetSocketId)) {
        io.to(targetSocketId).emit('kicked-from-meeting', {
          message: 'You have been removed from the meeting by the host.'
        });
        room.participants.delete(targetSocketId);
        io.to(`meeting_${currentMeetingId}`).emit('participant-left', { socketId: targetSocketId });
      }
    });

    // Host Moderation: Lock Meeting Toggle
    socket.on('toggle-lock-meeting', ({ isLocked }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;

      const requester = room.participants.get(socket.id);
      if (!requester || (!requester.isHost && !requester.isCoHost)) return;

      room.isLocked = isLocked;
      io.to(`meeting_${currentMeetingId}`).emit('meeting-lock-changed', { isLocked });
    });

    // Host Moderation: Toggle Waiting Room
    socket.on('toggle-waiting-room', ({ enabled }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;

      const requester = room.participants.get(socket.id);
      if (!requester || (!requester.isHost && !requester.isCoHost)) return;

      room.waitingRoomEnabled = enabled;
      io.to(`meeting_${currentMeetingId}`).emit('waiting-room-toggled', { enabled });
    });

    // Host Moderation: Assign Co-host
    socket.on('assign-cohost', ({ targetSocketId }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;

      const requester = room.participants.get(socket.id);
      if (!requester || !requester.isHost) return;

      const target = room.participants.get(targetSocketId);
      if (target) {
        target.isCoHost = !target.isCoHost;
        if (target.isCoHost) {
          room.coHosts.add(target.userId);
        } else {
          room.coHosts.delete(target.userId);
        }
        io.to(`meeting_${currentMeetingId}`).emit('cohost-status-changed', {
          socketId: targetSocketId,
          isCoHost: target.isCoHost
        });
      }
    });

    // Host Moderation: Update Permissions (Screen share, Chat, etc.)
    socket.on('update-permissions', (newPermissions) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;

      const requester = room.participants.get(socket.id);
      if (!requester || (!requester.isHost && !requester.isCoHost)) return;

      room.permissions = { ...room.permissions, ...newPermissions };
      io.to(`meeting_${currentMeetingId}`).emit('permissions-updated', room.permissions);
    });

    // Disconnect Handler
    socket.on('disconnect', () => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;

      // Check if was in waiting list
      if (room.waitingList.has(socket.id)) {
        room.waitingList.delete(socket.id);
        io.to(`meeting_${currentMeetingId}_hosts`).emit('waiting-list-update', getWaitingListArray(room));
      }

      // Check if was active participant
      if (room.participants.has(socket.id)) {
        const p = room.participants.get(socket.id);
        room.participants.delete(socket.id);

        io.to(`meeting_${currentMeetingId}`).emit('participant-left', {
          socketId: socket.id,
          name: p.name
        });

        // If host leaves and others remain, assign first co-host or oldest participant as host
        if (p.isHost && room.participants.size > 0) {
          const nextParticipant = Array.from(room.participants.values())[0];
          nextParticipant.isHost = true;
          io.to(`meeting_${currentMeetingId}`).emit('host-transferred', {
            socketId: nextParticipant.socketId,
            name: nextParticipant.name
          });
        }
      }

      // Cleanup empty rooms after 3 minutes if nobody joins
      if (room.participants.size === 0 && room.waitingList.size === 0) {
        setTimeout(() => {
          const r = rooms.get(currentMeetingId);
          if (r && r.participants.size === 0 && r.waitingList.size === 0) {
            rooms.delete(currentMeetingId);
          }
        }, 180000);
      }
    });
  });
}

module.exports = { setupMeetingSocket };
