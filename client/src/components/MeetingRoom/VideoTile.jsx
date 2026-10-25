import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, VideoOff, Hand, Pin, Shield, GraduationCap } from 'lucide-react';

export default function VideoTile({
  participant,
  stream,
  isLocal = false,
  isPinned = false,
  onPin,
  mirror = false
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = isLocal 
    ? (participant.videoEnabled && stream && stream.getVideoTracks().some(t => t.enabled))
    : (participant.videoEnabled && stream);

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 border transition-all ${
      participant.handRaised 
        ? 'ring-2 ring-amber-400 border-amber-400' 
        : participant.audioEnabled 
          ? 'border-slate-800' 
          : 'border-slate-800'
    } flex items-center justify-center group shadow-md`}>
      
      {/* Video Element */}
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // always mute local audio to prevent feedback loop!
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            hasVideo ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
          } ${isLocal && mirror ? 'scale-x-[-1]' : ''}`}
        />
      )}

      {/* Camera Off Avatar Placeholder */}
      {!hasVideo && (
        <div className="flex flex-col items-center justify-center p-4">
          <div className="relative">
            <img
              src={participant.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${participant.name}`}
              alt={participant.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-4 ring-slate-800 object-cover shadow-xl bg-slate-800"
            />
            {participant.handRaised && (
              <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1.5 rounded-full shadow-lg animate-bounce">
                <Hand className="w-4 h-4 fill-white" />
              </div>
            )}
          </div>
          <span className="mt-3 text-sm font-semibold text-slate-200">
            {participant.name} {isLocal && '(You)'}
          </span>
        </div>
      )}

      {/* Hand Raised Floating Banner */}
      {participant.handRaised && hasVideo && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-xs font-semibold backdrop-blur-md shadow-lg animate-pulse">
          <Hand className="w-3.5 h-3.5 fill-white" />
          <span>Raised Hand</span>
        </div>
      )}

      {/* Top Right Pin Button */}
      {onPin && (
        <button
          type="button"
          onClick={onPin}
          title={isPinned ? 'Unpin video' : 'Pin video'}
          className={`absolute top-3 right-3 p-1.5 rounded-xl backdrop-blur-md transition-all ${
            isPinned 
              ? 'bg-blue-600 text-white' 
              : 'bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bottom Info Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-medium max-w-[80%] truncate">
          {participant.isHost && (
            <span className="bg-blue-600 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" /> Host
            </span>
          )}
          {participant.isCoHost && !participant.isHost && (
            <span className="bg-indigo-600 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
              <GraduationCap className="w-2.5 h-2.5" /> Co-host
            </span>
          )}
          <span className="truncate">{participant.name} {isLocal && '(You)'}</span>
        </div>

        {/* Audio / Video Status Indicator */}
        <div className="flex items-center gap-1">
          <div className={`p-1.5 rounded-lg backdrop-blur-md ${
            participant.audioEnabled ? 'bg-black/60 text-emerald-400' : 'bg-rose-600 text-white'
          }`}>
            {participant.audioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </div>
          {!participant.videoEnabled && (
            <div className="p-1.5 rounded-lg bg-rose-600 text-white backdrop-blur-md">
              <VideoOff className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
