import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl?: string;
  fileName: string;
  className?: string;
}

export function AudioPlayer({ audioUrl, fileName, className }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setError('Failed to load audio file');
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = async () => {
    if (!audioRef.current || !audioUrl) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setError('Failed to play audio');
    }
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
  };

  const handleSeek = (values: number[]) => {
    if (!audioRef.current) return;
    const newTime = values[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (values: number[]) => {
    if (!audioRef.current) return;
    const newVolume = values[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return (
      <div className={cn("flex items-center space-x-2 p-2 rounded-lg bg-muted/50", className)}>
        <div className="flex items-center space-x-2 opacity-50">
          <Play className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">Audio not available</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center space-x-2 p-2 rounded-lg bg-destructive/10", className)}>
        <div className="flex items-center space-x-2 text-destructive">
          <Play className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 p-3 rounded-lg bg-muted/30", className)}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Main Controls */}
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={skipBackward}
          disabled={!audioUrl || isLoading}
          className="h-8 w-8 p-0"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlayPause}
          disabled={!audioUrl || isLoading}
          className="h-8 w-8 p-0"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={skipForward}
          disabled={!audioUrl || isLoading}
          className="h-8 w-8 p-0"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        <div className="flex-1 space-y-1">
          <div className="text-xs text-muted-foreground truncate">
            {fileName}
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
              disabled={!audioUrl || isLoading}
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-1">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[volume]}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="w-16"
          />
        </div>
      </div>
    </div>
  );
}