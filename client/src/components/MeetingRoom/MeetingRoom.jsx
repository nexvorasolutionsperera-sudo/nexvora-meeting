import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, 
  Users, MessageSquare, Shield, Smile, Hand, Maximize, 
  Minimize, Share2, PenTool, Lock, Settings as SettingsIcon,
  AlertCircle, CheckCircle2, Volume2
} from 'lucide-react';
import VideoTile from './VideoTile';
import ParticipantsDrawer from './ParticipantsDrawer';
import ChatDrawer from './ChatDrawer';
import SecurityDrawer from './SecurityDrawer';
import Whiteboard from '../Whiteboard';
import InviteModal from '../InviteModal';
import ReportModal from '../ReportModal';
import SettingsModal from '../SettingsModal';
import { api } from '../../services/api';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'stun:openrelay.metered.ca:80' }
  ],
  iceCandidatePoolSize: 10
};

export default function MeetingRoom({ meetingId, currentUser, onLeave }) {
  // Meeting metadata
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);
  const [permissions, setPermissions] = useState({
    allowScreenShare: true,
    allowChat: true,
    allowUnmute: true
  });

  // Access State (waiting room / passcode / error)
  const [inWaitingRoom, setInWaitingRoom] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState('Waiting for host approval...');
  const [isDenied, setIsDenied] = useState(false);
  const [needsPasscode, setNeedsPasscode] = useState(false);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [joinError, setJoinError] = useState('');

  // Media streams & controls
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [pinnedSocketId, setPinnedSocketId] = useState(null);
  const [cameraResolution, setCameraResolution] = useState('720p');

  // Participants & Lists
  const [participants, setParticipants] = useState([]);
  const [waitingList, setWaitingList] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({}); // socketId -> MediaStream
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);

  // Active Speaker & 100+ Large Meeting Scale
  const [activeSpeakerName, setActiveSpeakerName] = useState('');
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [gridPage, setGridPage] = useState(1);
  const audioContextRef = useRef(null);

  // Active Drawers / Modals
  const [activeDrawer, setActiveDrawer] = useState(null); // 'participants' | 'chat' | 'security'
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);

  // Refs for WebRTC & Socket
  const socketRef = useRef(null);
  const peersRef = useRef({}); // socketId -> RTCPeerConnection
  const pendingCandidatesRef = useRef({}); // socketId -> Array of RTCIceCandidateInit
  const localStreamRef = useRef(null);
  const containerRef = useRef(null);

  // Helper to drain any early ICE candidates that arrived before setRemoteDescription
  const drainCandidateQueue = async (senderSocketId, peer) => {
    const queue = pendingCandidatesRef.current[senderSocketId] || [];
    pendingCandidatesRef.current[senderSocketId] = [];
    for (const cand of queue) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('Error applying queued ICE candidate:', e);
      }
    }
  };

  // Load meeting metadata from server
  useEffect(() => {
    async function fetchMeeting() {
      try {
        const data = await api.getMeeting(meetingId);
        setMeetingInfo(data);
        if (data.hasPasscode) {
          // If not host, require passcode prompt
          const isUserHost = currentUser && data.hostId === currentUser.id;
          if (!isUserHost) {
            setNeedsPasscode(true);
            return;
          }
        }
        initMeeting();
      } catch (err) {
        setJoinError(err.message || 'Meeting not found');
      }
    }
    fetchMeeting();

    const timer = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      cleanUp();
    };
  }, [meetingId]);

  const cleanUp = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    Object.values(peersRef.current).forEach(peer => peer.close());
    peersRef.current = {};
    pendingCandidatesRef.current = {};
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const handleVerifyPasscode = async (e) => {
    e.preventDefault();
    setPasscodeError('');
    try {
      await api.verifyPasscode(meetingId, enteredPasscode);
      setNeedsPasscode(false);
      initMeeting();
    } catch (err) {
      setPasscodeError(err.message || 'Incorrect meeting password');
    }
  };

  // Initialize Media & Socket Connection
  const initMeeting = async () => {
    try {
      // 1. Acquire camera & mic media with resilient multi-level fallback
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: {
            width: { ideal: cameraResolution === '1080p' ? 1920 : cameraResolution === '720p' ? 1280 : 640 },
            height: { ideal: cameraResolution === '1080p' ? 1080 : cameraResolution === '720p' ? 720 : 360 },
            facingMode: 'user'
          }
        });
      } catch (mediaErr) {
        console.warn('Constrained getUserMedia failed, trying unconstrained audio+video:', mediaErr.message);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        } catch (basicErr) {
          console.warn('Basic getUserMedia failed, trying audio-only fallback:', basicErr.message);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsVideoOff(true);
          } catch (audioErr) {
            console.warn('No physical webcam/mic available, joining with virtual spectator stream:', audioErr.message);
            stream = createVirtualStream(currentUser?.name || 'Guest');
            setIsAudioMuted(true);
            setIsVideoOff(true);
          }
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Setup Web Audio API Analyzer for active speaker detection
      setupLocalAudioAnalyzer(stream);

      // Check user preferences for initial mute
      if (currentUser?.settings?.muteAudioOnJoin) {
        stream.getAudioTracks().forEach(t => (t.enabled = false));
        setIsAudioMuted(true);
      }
      if (currentUser?.settings?.turnOffVideoOnJoin) {
        stream.getVideoTracks().forEach(t => (t.enabled = false));
        setIsVideoOff(true);
      }

      // 2. Connect Socket.IO
      const socket = io('/', {
        transports: ['websocket', 'polling']
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join-room', {
          meetingId,
          user: {
            id: currentUser?.id || `guest_${socket.id.slice(0, 5)}`,
            name: currentUser?.name || 'Guest User',
            avatar: currentUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.name || 'guest'}`
          },
          initialSettings: {
            audioEnabled: !currentUser?.settings?.muteAudioOnJoin,
            videoEnabled: !currentUser?.settings?.turnOffVideoOnJoin
          }
        });
      });

      // Waiting room handlers
      socket.on('waiting-room-status', ({ inWaitingRoom, message }) => {
        setInWaitingRoom(inWaitingRoom);
        setWaitingMessage(message);
      });

      socket.on('admitted-to-meeting', () => {
        setInWaitingRoom(false);
        socket.emit('join-room', {
          meetingId,
          user: {
            id: currentUser?.id || `guest_${socket.id.slice(0, 5)}`,
            name: currentUser?.name || 'Guest User',
            avatar: currentUser?.avatar
          },
          initialSettings: {
            audioEnabled: !isAudioMuted,
            videoEnabled: !isVideoOff
          }
        });
      });

      socket.on('denied-entry', ({ message }) => {
        setIsDenied(true);
        setWaitingMessage(message);
      });

      // Room state once joined
      socket.on('room-joined', (data) => {
        setIsHost(data.isHost);
        setIsCoHost(data.isCoHost);
        setIsLocked(data.isLocked);
        setWaitingRoomEnabled(data.waitingRoomEnabled);
        setPermissions(data.permissions);
        setParticipants(data.participants);
        setWaitingList(data.waitingList || []);
        setMessages(data.messages || []);

        // Establish WebRTC peer connections with existing participants
        data.participants.forEach((p) => {
          if (p.socketId !== socket.id) {
            initiatePeerConnection(p.socketId, true);
          }
        });
      });

      // Join/Leave events
      socket.on('participant-joined', (participant) => {
        setParticipants(prev => {
          if (prev.some(p => p.socketId === participant.socketId)) return prev;
          return [...prev, participant];
        });
      });

      socket.on('participant-left', ({ socketId }) => {
        setParticipants(prev => prev.filter(p => p.socketId !== socketId));
        if (peersRef.current[socketId]) {
          peersRef.current[socketId].close();
          delete peersRef.current[socketId];
        }
        delete pendingCandidatesRef.current[socketId];
        setRemoteStreams(prev => {
          const updated = { ...prev };
          delete updated[socketId];
          return updated;
        });
      });

      // WebRTC Signaling Handlers with ICE Candidate Queue
      socket.on('signal-offer', async ({ senderSocketId, offer }) => {
        try {
          const peer = initiatePeerConnection(senderSocketId, false);
          if (peer.signalingState !== 'stable') {
            await Promise.all([
              peer.setLocalDescription({ type: 'rollback' }).catch(() => {})
            ]);
          }
          await peer.setRemoteDescription(new RTCSessionDescription(offer));
          await drainCandidateQueue(senderSocketId, peer);

          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit('signal-answer', { targetSocketId: senderSocketId, answer });
        } catch (err) {
          console.error('Error handling signal-offer:', err);
        }
      });

      socket.on('signal-answer', async ({ senderSocketId, answer }) => {
        try {
          const peer = peersRef.current[senderSocketId];
          if (peer && (peer.signalingState === 'have-local-offer' || peer.signalingState === 'have-remote-pranswer')) {
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
            await drainCandidateQueue(senderSocketId, peer);
          }
        } catch (err) {
          console.error('Error handling signal-answer:', err);
        }
      });

      socket.on('ice-candidate', async ({ senderSocketId, candidate }) => {
        if (!candidate) return;
        const peer = peersRef.current[senderSocketId];
        if (peer && peer.remoteDescription && peer.remoteDescription.type) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('Error adding ICE candidate:', e);
          }
        } else {
          if (!pendingCandidatesRef.current[senderSocketId]) {
            pendingCandidatesRef.current[senderSocketId] = [];
          }
          pendingCandidatesRef.current[senderSocketId].push(candidate);
        }
      });

      // Media status changes from peers
      socket.on('participant-audio-change', ({ socketId, enabled }) => {
        setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, audioEnabled: enabled } : p));
      });

      socket.on('participant-video-change', ({ socketId, enabled }) => {
        setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, videoEnabled: enabled } : p));
      });

      socket.on('participant-screen-change', ({ socketId, enabled }) => {
        setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, screenSharing: enabled } : p));
      });

      socket.on('participant-hand-change', ({ socketId, raised }) => {
        setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, handRaised: raised } : p));
      });

      // Active Speaker Broadcast Handler
      socket.on('participant-speaking-change', ({ socketId, name, isSpeaking }) => {
        setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, isSpeaking } : p));
        if (isSpeaking) {
          setActiveSpeakerName(name);
        }
      });

      // Host Moderation Events
      socket.on('force-stop-video', () => {
        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.enabled = false;
            try { videoTrack.stop(); } catch (e) {}
            localStreamRef.current.removeTrack(videoTrack);
          }
          Object.values(peersRef.current).forEach(peer => {
            const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              try { sender.replaceTrack(null); } catch (e) {}
            }
          });
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
        setIsVideoOff(true);
        socket.emit('toggle-video', { enabled: false });
      });

      socket.on('force-mute', () => {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = false));
        }
        setIsAudioMuted(true);
        socket.emit('toggle-audio', { enabled: false });
      });

      socket.on('all-muted', () => {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = false));
        }
        setIsAudioMuted(true);
        socket.emit('toggle-audio', { enabled: false });
      });

      socket.on('kicked-from-meeting', ({ message }) => {
        alert(message || 'You have been removed from the meeting.');
        onLeave();
      });

      socket.on('waiting-list-update', (list) => {
        setWaitingList(list);
      });

      socket.on('meeting-lock-changed', ({ isLocked }) => {
        setIsLocked(isLocked);
      });

      socket.on('waiting-room-toggled', ({ enabled }) => {
        setWaitingRoomEnabled(enabled);
      });

      socket.on('permissions-updated', (newPerms) => {
        setPermissions(newPerms);
      });

      socket.on('cohost-status-changed', ({ socketId, isCoHost: coHostStatus }) => {
        setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, isCoHost: coHostStatus } : p));
        if (socket.id === socketId) {
          setIsCoHost(coHostStatus);
        }
      });

      // Reactions & Chat
      socket.on('new-reaction', (reaction) => {
        setReactions(prev => [...prev, reaction]);
        setTimeout(() => {
          setReactions(prev => prev.filter(r => r.id !== reaction.id));
        }, 2200);
      });

      socket.on('new-chat-message', (msg) => {
        setMessages(prev => [...prev, msg]);
      });

      socket.on('join-error', ({ message }) => {
        setJoinError(message);
      });

    } catch (err) {
      console.error('Init meeting error:', err);
      setJoinError('Failed to access camera and microphone or join room.');
    }
  };

  // Real-Time Audio Level Analyzer for Active Speaker Detection
  const setupLocalAudioAnalyzer = (stream) => {
    try {
      const audioTrack = stream?.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speaking = false;
      let silenceTimeout = null;

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // If audio above voice threshold and mic not muted
        if (average > 15 && audioTrack.enabled) {
          if (!speaking) {
            speaking = true;
            setIsLocalSpeaking(true);
            socketRef.current?.emit('participant-speaking', { isSpeaking: true });
          }
          if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
          }
        } else {
          if (speaking && !silenceTimeout) {
            silenceTimeout = setTimeout(() => {
              speaking = false;
              setIsLocalSpeaking(false);
              socketRef.current?.emit('participant-speaking', { isSpeaking: false });
              silenceTimeout = null;
            }, 500);
          }
        }
      };

      const intervalId = setInterval(checkVolume, 150);
      return () => clearInterval(intervalId);
    } catch (e) {
      console.warn('Audio analyzer init note:', e);
    }
  };

  // Create Virtual MediaStream fallback if no physical webcam
  const createVirtualStream = (name) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    
    // Draw initial virtual card
    const draw = () => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(320, 160, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name, 320, 260);
    };
    draw();

    const videoStream = canvas.captureStream(15);
    // Silent audio track using AudioContext
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    const audioTrack = dest.stream.getAudioTracks()[0];
    if (audioTrack) videoStream.addTrack(audioTrack);

    return videoStream;
  };

  // Initiate RTCPeerConnection with a peer
  const initiatePeerConnection = (targetSocketId, isInitiator) => {
    if (peersRef.current[targetSocketId]) {
      return peersRef.current[targetSocketId];
    }

    const peer = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetSocketId] = peer;

    // Add all existing local tracks to peer
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          peer.addTrack(track, localStreamRef.current);
        } catch (e) {
          console.warn('Error adding track to peer:', e);
        }
      });
    }

    // Handle remote tracks: ALWAYS create a new MediaStream instance so React triggers re-render!
    peer.ontrack = (event) => {
      console.log(`[WebRTC] ontrack received from ${targetSocketId}:`, event.track.kind);
      setRemoteStreams(prev => {
        const existingStream = prev[targetSocketId];
        let newStream;
        if (existingStream) {
          const tracks = existingStream.getTracks();
          if (!tracks.some(t => t.id === event.track.id)) {
            tracks.push(event.track);
          }
          newStream = new MediaStream(tracks);
        } else {
          newStream = event.streams && event.streams[0] 
            ? new MediaStream(event.streams[0].getTracks()) 
            : new MediaStream([event.track]);
        }
        return {
          ...prev,
          [targetSocketId]: newStream
        };
      });
    };

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log(`[ICE] state with ${targetSocketId}:`, peer.iceConnectionState);
      if (peer.iceConnectionState === 'failed') {
        peer.restartIce();
      }
    };

    // If initiator, create and send offer specifying desire to both receive audio & video
    if (isInitiator) {
      peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      }).then(async (offer) => {
        await peer.setLocalDescription(offer);
        socketRef.current?.emit('signal-offer', { targetSocketId, offer });
      }).catch(err => console.error('Error creating offer', err));
    }

    return peer;
  };

  // Toggle Audio (Mute / Unmute) with dynamic track acquisition if missing
  const toggleAudio = async () => {
    if (!localStreamRef.current) return;

    let audioTrack = localStreamRef.current.getAudioTracks()[0];

    // If audio track does not exist or has ended, acquire fresh mic permission dynamically
    if (!audioTrack || audioTrack.readyState === 'ended') {
      try {
        const newMicStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        const newTrack = newMicStream.getAudioTracks()[0];
        if (newTrack) {
          if (audioTrack) localStreamRef.current.removeTrack(audioTrack);
          localStreamRef.current.addTrack(newTrack);
          audioTrack = newTrack;

          // Replace track on all existing peers
          Object.values(peersRef.current).forEach(peer => {
            const sender = peer.getSenders().find(s => s.track && s.track.kind === 'audio');
            if (sender) {
              sender.replaceTrack(newTrack);
            } else {
              peer.addTrack(newTrack, localStreamRef.current);
            }
          });

          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          setupLocalAudioAnalyzer(localStreamRef.current);
        }
      } catch (err) {
        console.error('Cannot access mic:', err);
        alert('Could not access microphone. Please check browser microphone permissions.');
        return;
      }
    }

    if (audioTrack) {
      const newMuted = !isAudioMuted;
      audioTrack.enabled = !newMuted;
      setIsAudioMuted(newMuted);
      socketRef.current?.emit('toggle-audio', { enabled: !newMuted });
    }
  };

  // Toggle Video (Camera On / Off) with hardware camera shutdown on off & dynamic acquisition on on
  const toggleVideo = async () => {
    if (!localStreamRef.current) return;

    let videoTrack = localStreamRef.current.getVideoTracks()[0];

    // If video is currently ON, turn it OFF and stop the physical webcam hardware
    if (!isVideoOff && videoTrack) {
      try {
        videoTrack.enabled = false;
        videoTrack.stop(); // Powers off hardware webcam and turns off camera indicator light
        localStreamRef.current.removeTrack(videoTrack);
      } catch (e) {
        console.warn('Error stopping video track:', e);
      }

      // Replace with null on all peers so they stop receiving video frames
      Object.values(peersRef.current).forEach(peer => {
        const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          try {
            sender.replaceTrack(null);
          } catch (e) {}
        }
      });

      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setIsVideoOff(true);
      socketRef.current?.emit('toggle-video', { enabled: false });
      return;
    }

    // If video is currently OFF, turn it ON by acquiring a fresh webcam track
    if (isVideoOff || !videoTrack || videoTrack.readyState === 'ended') {
      try {
        const newCamStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: cameraResolution === '1080p' ? 1920 : cameraResolution === '720p' ? 1280 : 640 },
            height: { ideal: cameraResolution === '1080p' ? 1080 : cameraResolution === '720p' ? 720 : 360 },
            facingMode: 'user'
          }
        });
        const newTrack = newCamStream.getVideoTracks()[0];
        if (newTrack) {
          if (videoTrack) {
            try { localStreamRef.current.removeTrack(videoTrack); } catch (e) {}
          }
          localStreamRef.current.addTrack(newTrack);

          // Replace track on all existing peers
          Object.values(peersRef.current).forEach(peer => {
            const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              sender.replaceTrack(newTrack);
            } else {
              peer.addTrack(newTrack, localStreamRef.current);
            }
          });

          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          setIsVideoOff(false);
          socketRef.current?.emit('toggle-video', { enabled: true });
        }
      } catch (err) {
        console.error('Cannot access camera:', err);
        alert('Could not access camera. Please check browser camera permissions.');
      }
    }
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (!permissions.allowScreenShare && !isHost && !isCoHost) {
      alert('Screen sharing has been disabled by the meeting host.');
      return;
    }

    if (isScreenSharing) {
      // Stop screen share
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
      }
      setScreenStream(null);
      setIsScreenSharing(false);

      // Revert peer video tracks to camera
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      if (cameraTrack) {
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(cameraTrack);
        });
      }
      socketRef.current?.emit('toggle-screen-share', { enabled: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true
        });

        setScreenStream(stream);
        setIsScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];
        // Replace peer tracks with screen track
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        socketRef.current?.emit('toggle-screen-share', { enabled: true });

        screenTrack.onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.error('Screen share error:', err);
      }
    }
  };

  // Raise / Lower Hand
  const toggleHand = () => {
    const nextHand = !isHandRaised;
    setIsHandRaised(nextHand);
    socketRef.current?.emit('toggle-hand', { raised: nextHand });
  };

  // Send Emoji Reaction
  const sendReaction = (emoji) => {
    socketRef.current?.emit('send-reaction', { emoji });
  };

  // Send Chat Message
  const handleSendMessage = (msgData) => {
    socketRef.current?.emit('send-chat', msgData);
  };

  // Full Screen Toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
    }
  };

  // Host Controls
  const handleMuteParticipant = (targetSocketId) => {
    socketRef.current?.emit('mute-participant', { targetSocketId });
  };

  const handleStopVideoParticipant = (targetSocketId) => {
    socketRef.current?.emit('stop-video-participant', { targetSocketId });
  };

  const handleMuteAll = () => {
    socketRef.current?.emit('mute-all');
  };

  const handleRemoveParticipant = (targetSocketId) => {
    if (confirm('Are you sure you want to remove this participant?')) {
      socketRef.current?.emit('remove-participant', { targetSocketId });
    }
  };

  const handleToggleCoHost = (targetSocketId) => {
    socketRef.current?.emit('assign-cohost', { targetSocketId });
  };

  const handleToggleLock = (locked) => {
    socketRef.current?.emit('toggle-lock-meeting', { isLocked: locked });
  };

  const handleToggleWaitingRoom = (enabled) => {
    socketRef.current?.emit('toggle-waiting-room', { enabled });
  };

  const handleUpdatePermission = (perms) => {
    socketRef.current?.emit('update-permissions', perms);
  };

  const handleAdmit = (socketId) => {
    socketRef.current?.emit('admit-participant', { socketId });
  };

  const handleAdmitAll = () => {
    socketRef.current?.emit('admit-all');
  };

  const handleDeny = (socketId) => {
    socketRef.current?.emit('deny-participant', { socketId });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Passcode Entry Screen
  if (needsPasscode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-1">{meetingInfo?.title || 'Password Protected Meeting'}</h2>
          <p className="text-xs text-slate-400 mb-6">This meeting requires a passcode to enter.</p>

          {passcodeError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passcodeError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            <input
              type="password"
              required
              placeholder="Enter Meeting Passcode"
              value={enteredPasscode}
              onChange={(e) => setEnteredPasscode(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-center font-mono tracking-widest text-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onLeave}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-lg shadow-blue-500/20"
              >
                Join Meeting
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Denied Entry Screen
  if (isDenied) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-sm text-slate-400 mb-6">{waitingMessage}</p>
          <button
            onClick={onLeave}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Waiting Room Screen
  if (inWaitingRoom) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
            <div className="w-16 h-16 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent animate-spin flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-1">Nexvora Waiting Room</h2>
          <p className="text-sm text-blue-400 font-semibold mb-3">{meetingInfo?.title || 'Meeting Room'}</p>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Please wait, the meeting host will let you in soon.
          </p>
          <button
            onClick={onLeave}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            Leave Waiting Room
          </button>
        </div>
      </div>
    );
  }

  // Join Error Screen
  if (joinError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-2">Unable to Join Meeting</h2>
          <p className="text-sm text-slate-400 mb-6">{joinError}</p>
          <button
            onClick={onLeave}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Local participant object for video tile
  const localParticipant = {
    socketId: socketRef.current?.id || 'local',
    userId: currentUser?.id || 'local_user',
    name: currentUser?.name || 'You',
    avatar: currentUser?.avatar,
    isHost,
    isCoHost,
    audioEnabled: !isAudioMuted,
    videoEnabled: !isVideoOff,
    screenSharing: isScreenSharing,
    handRaised: isHandRaised,
    isSpeaking: isLocalSpeaking
  };

  const remoteParticipants = participants.filter(p => p.socketId !== socketRef.current?.id);
  const allParticipants = [localParticipant, ...remoteParticipants];
  const totalParticipantCount = allParticipants.length;

  // Active Screen Sharer (either local or remote)
  const activeScreenSharer = isScreenSharing 
    ? localParticipant 
    : remoteParticipants.find(p => p.screenSharing);

  // Pagination for 100+ Large Meetings
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(allParticipants.length / pageSize));
  const paginatedParticipants = allParticipants.slice((gridPage - 1) * pageSize, gridPage * pageSize);

  return (
    <div 
      ref={containerRef}
      className="relative w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none font-sans"
    >
      
      {/* Top Header Bar */}
      <header className="h-14 px-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between shrink-0 z-20">
        
        {/* Left: Logo & Meeting Title & Security Status */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Nexvora Logo"
            className="w-8 h-8 object-contain rounded-lg bg-white p-0.5 ring-1 ring-blue-500/30 shrink-0"
          />
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm sm:text-base text-slate-100 max-w-[180px] sm:max-w-xs truncate">
              {meetingInfo?.title || `Meeting ${meetingId}`}
            </h1>
            {isLocked && (
              <span className="px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/60 text-[10px] font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
            {waitingRoomEnabled && (
              <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/60 text-[10px] font-semibold flex items-center gap-1 hidden sm:flex">
                Waiting Room
              </span>
            )}
          </div>
        </div>

        {/* Center: Live Speaker, Timer & Code Badge */}
        <div className="flex items-center gap-2">
          {activeSpeakerName && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-xs font-bold animate-pulse shadow-md">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Speaking: {activeSpeakerName}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{formatDuration(meetingDuration)}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>{totalParticipantCount}</span>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWhiteboard(!showWhiteboard)}
            title="Interactive Whiteboard"
            className={`p-2 rounded-xl border transition-all ${
              showWhiteboard
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <PenTool className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullScreen}
            title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            title="Meeting Settings"
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Conference Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Video Grid Area */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto flex items-center justify-center relative">
          
          {/* Floating Emoji Reactions Stream */}
          <div className="absolute bottom-16 right-8 pointer-events-none z-40 flex flex-col items-end space-y-2">
            {reactions.map((r) => (
              <div 
                key={r.id} 
                className="animate-reaction flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 shadow-2xl text-lg"
              >
                <span>{r.emoji}</span>
                <span className="text-xs font-semibold text-slate-300">{r.senderName}</span>
              </div>
            ))}
          </div>

          {/* 100+ Attendees Stage / Presentation & Grid Layout */}
          {activeScreenSharer ? (
            /* Spotlight Screen Share Stage View (Full HD for 100+ Participants) */
            <div className="w-full h-full max-w-7xl mx-auto flex flex-col gap-3">
              {/* Main Presentation View */}
              <div className="flex-1 rounded-2xl overflow-hidden bg-black border border-blue-500/80 shadow-2xl relative flex items-center justify-center min-h-[50vh]">
                <video
                  autoPlay
                  playsInline
                  muted={activeScreenSharer.socketId === socketRef.current?.id}
                  ref={(el) => {
                    if (el) {
                      el.srcObject = activeScreenSharer.socketId === socketRef.current?.id
                        ? screenStream
                        : remoteStreams[activeScreenSharer.socketId];
                    }
                  }}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg">
                  <ScreenShare className="w-4 h-4" />
                  <span>
                    {activeScreenSharer.socketId === socketRef.current?.id 
                      ? 'You are presenting your screen to everyone' 
                      : `${activeScreenSharer.name} is sharing screen`}
                  </span>
                </div>
              </div>

              {/* Horizontal Filmstrip of Attendees */}
              <div className="h-28 sm:h-32 flex items-center gap-2 overflow-x-auto pb-1 shrink-0 px-1">
                {allParticipants.map((p) => (
                  <div key={p.socketId} className="w-36 h-full shrink-0">
                    <VideoTile
                      participant={p}
                      stream={p.socketId === socketRef.current?.id ? localStream : remoteStreams[p.socketId]}
                      isLocal={p.socketId === socketRef.current?.id}
                      isPinned={pinnedSocketId === p.socketId}
                      onPin={() => setPinnedSocketId(pinnedSocketId === p.socketId ? null : p.socketId)}
                      mirror={p.socketId === socketRef.current?.id && currentUser?.settings?.mirrorVideo !== false}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Standard / 100+ Large Classroom Grid Layout */
            <div className="w-full h-full max-w-7xl mx-auto flex flex-col">
              {/* Video Grid */}
              <div className={`flex-1 grid gap-3 sm:gap-4 ${
                paginatedParticipants.length === 1 
                  ? 'grid-cols-1 max-w-4xl max-h-[75vh] mx-auto' 
                  : paginatedParticipants.length === 2 
                    ? 'grid-cols-1 md:grid-cols-2 max-h-[80vh]' 
                    : paginatedParticipants.length <= 4 
                      ? 'grid-cols-2 max-h-[85vh]' 
                      : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              }`}>
                {paginatedParticipants.map((p) => (
                  <VideoTile
                    key={p.socketId}
                    participant={p}
                    stream={p.socketId === socketRef.current?.id ? localStream : remoteStreams[p.socketId]}
                    isLocal={p.socketId === socketRef.current?.id}
                    isPinned={pinnedSocketId === p.socketId}
                    onPin={() => setPinnedSocketId(pinnedSocketId === p.socketId ? null : p.socketId)}
                    mirror={p.socketId === socketRef.current?.id && currentUser?.settings?.mirrorVideo !== false}
                  />
                ))}
              </div>

              {/* Pagination Controls for 100+ Participants */}
              {totalPages > 1 && (
                <div className="mt-2 py-1.5 flex items-center justify-center gap-3 shrink-0">
                  <button
                    disabled={gridPage === 1}
                    onClick={() => setGridPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold"
                  >
                    ◀ Prev Page
                  </button>
                  <span className="text-xs font-bold text-slate-400">
                    Page {gridPage} of {totalPages} ({allParticipants.length} Participants)
                  </span>
                  <button
                    disabled={gridPage === totalPages}
                    onClick={() => setGridPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold"
                  >
                    Next Page ▶
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side Drawers */}
        <ParticipantsDrawer
          isOpen={activeDrawer === 'participants'}
          onClose={() => setActiveDrawer(null)}
          participants={[localParticipant, ...remoteParticipants]}
          waitingList={waitingList}
          currentSocketId={socketRef.current?.id}
          isHost={isHost}
          isCoHost={isCoHost}
          onMuteParticipant={handleMuteParticipant}
          onStopVideoParticipant={handleStopVideoParticipant}
          onMuteAll={handleMuteAll}
          onRemoveParticipant={handleRemoveParticipant}
          onToggleCoHost={handleToggleCoHost}
          onAdmitParticipant={handleAdmit}
          onAdmitAll={handleAdmitAll}
          onDenyParticipant={handleDeny}
          onOpenInvite={() => setShowInviteModal(true)}
          onReportParticipant={(p) => setReportTarget(p)}
        />

        <ChatDrawer
          isOpen={activeDrawer === 'chat'}
          onClose={() => setActiveDrawer(null)}
          messages={messages}
          participants={[localParticipant, ...remoteParticipants]}
          currentSocketId={socketRef.current?.id}
          canChat={permissions.allowChat || isHost || isCoHost}
          onSendMessage={handleSendMessage}
        />

        <SecurityDrawer
          isOpen={activeDrawer === 'security'}
          onClose={() => setActiveDrawer(null)}
          isLocked={isLocked}
          waitingRoomEnabled={waitingRoomEnabled}
          permissions={permissions}
          onToggleLock={handleToggleLock}
          onToggleWaitingRoom={handleToggleWaitingRoom}
          onUpdatePermission={handleUpdatePermission}
        />
      </div>

      {/* Interactive Bottom Control Toolbar */}
      <footer className="h-20 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 px-4 sm:px-8 flex items-center justify-between shrink-0 z-30">
        
        {/* Left: Audio & Video Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Microphone */}
          <button
            onClick={toggleAudio}
            className={`flex flex-col items-center justify-center w-12 sm:w-16 h-14 rounded-2xl transition-all ${
              isAudioMuted 
                ? 'bg-rose-600/90 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
            <span className="text-[10px] font-medium mt-1">{isAudioMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Camera */}
          <button
            onClick={toggleVideo}
            className={`flex flex-col items-center justify-center w-12 sm:w-16 h-14 rounded-2xl transition-all ${
              isVideoOff 
                ? 'bg-rose-600/90 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5 text-blue-400" />}
            <span className="text-[10px] font-medium mt-1">{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
          </button>
        </div>

        {/* Center: Collaboration Tools */}
        <div className="flex items-center gap-1 sm:gap-2">
          
          {/* Security (Host/Co-host only) */}
          {(isHost || isCoHost) && (
            <button
              onClick={() => setActiveDrawer(activeDrawer === 'security' ? null : 'security')}
              className={`flex flex-col items-center justify-center w-12 sm:w-14 h-14 rounded-2xl transition-all ${
                activeDrawer === 'security' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-[10px] font-medium mt-1">Security</span>
            </button>
          )}

          {/* Participants */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'participants' ? null : 'participants')}
            className={`relative flex flex-col items-center justify-center w-12 sm:w-14 h-14 rounded-2xl transition-all ${
              activeDrawer === 'participants' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">People</span>
            {waitingList.length > 0 && (isHost || isCoHost) && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 text-slate-950 font-bold text-[9px] rounded-full flex items-center justify-center animate-bounce">
                {waitingList.length}
              </span>
            )}
          </button>

          {/* In-Meeting Chat */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'chat' ? null : 'chat')}
            className={`flex flex-col items-center justify-center w-12 sm:w-14 h-14 rounded-2xl transition-all ${
              activeDrawer === 'chat' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">Chat</span>
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`flex flex-col items-center justify-center w-12 sm:w-14 h-14 rounded-2xl transition-all ${
              isScreenSharing 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' 
                : 'bg-slate-800/80 hover:bg-slate-700 text-emerald-400'
            }`}
          >
            <ScreenShare className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">{isScreenSharing ? 'Sharing' : 'Share'}</span>
          </button>

          {/* Raise Hand */}
          <button
            onClick={toggleHand}
            className={`flex flex-col items-center justify-center w-12 sm:w-14 h-14 rounded-2xl transition-all ${
              isHandRaised 
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25' 
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Hand className={`w-5 h-5 ${isHandRaised ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium mt-1">{isHandRaised ? 'Lower' : 'Raise'}</span>
          </button>

          {/* Emoji Reactions Picker */}
          <div className="relative group">
            <button
              className="flex flex-col items-center justify-center w-12 sm:w-14 h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all"
            >
              <Smile className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] font-medium mt-1">React</span>
            </button>

            {/* Hover popup reaction tray */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1.5 p-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50">
              {['👍', '👏', '❤️', '🎉', '😮', '😂', '🚀'].map((em) => (
                <button
                  key={em}
                  onClick={() => sendReaction(em)}
                  className="text-xl p-1.5 hover:scale-135 transition-transform"
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Leave / End Meeting Button */}
        <div>
          <button
            onClick={onLeave}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
          >
            <PhoneOff className="w-4 h-4" />
            <span>{isHost ? 'End Meeting' : 'Leave'}</span>
          </button>
        </div>
      </footer>

      {/* Interactive Whiteboard Tool */}
      <Whiteboard
        isOpen={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
      />

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        meeting={{ ...meetingInfo, id: meetingId }}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        meetingId={meetingId}
        targetParticipant={reportTarget}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}
