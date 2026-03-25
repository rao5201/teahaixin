import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';

const COLORS = {
  card: '#1e1e2f',
  text: '#ffffff',
  textSecondary: '#8e8e9a',
  border: '#2d2d44',
  background: '#0f0f1a',
};

export default function AudioPlayer({ uri, color = '#6c5ce7' }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState(null);
  const soundRef = useRef(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        if (soundRef.current) {
          soundRef.current.setPositionAsync(0).catch(() => {});
        }
      }
    }
    if (status.error) {
      setError('音频播放出错');
      setIsPlaying(false);
    }
  };

  const loadAndPlay = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = newSound;
      setSound(newSound);
      setIsPlaying(true);
    } catch (err) {
      console.warn('Audio load error:', err);
      setError('无法加载音频');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (isLoading) return;

    if (!soundRef.current) {
      await loadAndPlay();
      return;
    }

    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (err) {
      console.warn('Playback error:', err);
      await loadAndPlay();
    }
  };

  const handleSeek = async (forward) => {
    if (!soundRef.current) return;
    try {
      const newPos = forward
        ? Math.min(position + 10000, duration)
        : Math.max(position - 10000, 0);
      await soundRef.current.setPositionAsync(newPos);
    } catch (err) {
      console.warn('Seek error:', err);
    }
  };

  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  if (!uri) return null;

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadAndPlay}>
            <Text style={[styles.retryText, { color }]}>重试</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: color },
              ]}
            />
          </View>

          {/* Time */}
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.seekButton}
              onPress={() => handleSeek(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.seekText}>-10s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: color }]}
              onPress={handlePlayPause}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.playButtonText}>
                  {isPlaying ? '⏸' : '▶'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.seekButton}
              onPress={() => handleSeek(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.seekText}>+10s</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.background,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  seekButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  seekText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  playButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  errorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
