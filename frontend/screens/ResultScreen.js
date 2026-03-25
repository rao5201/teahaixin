import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Share,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import AudioPlayer from '../components/AudioPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  background: '#0f0f1a',
  card: '#1e1e2f',
  primary: '#6c5ce7',
  primaryLight: '#a29bfe',
  text: '#ffffff',
  textSecondary: '#8e8e9a',
  border: '#2d2d44',
};

const EMOTION_CONFIG = {
  happy: { color: '#FFD700', emoji: '😊', label: '开心', gradient: ['#FFD700', '#FFA500'] },
  sad: { color: '#4A90E2', emoji: '😢', label: '悲伤', gradient: ['#4A90E2', '#357ABD'] },
  angry: { color: '#E74C3C', emoji: '😠', label: '愤怒', gradient: ['#E74C3C', '#C0392B'] },
  peaceful: { color: '#2ECC71', emoji: '😌', label: '平静', gradient: ['#2ECC71', '#27AE60'] },
  anxious: { color: '#95A5A6', emoji: '😰', label: '焦虑', gradient: ['#95A5A6', '#7F8C8D'] },
  romantic: { color: '#FF69B4', emoji: '😍', label: '浪漫', gradient: ['#FF69B4', '#FF1493'] },
};

export default function ResultScreen({ route }) {
  const { result } = route.params || {};
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const emotion = result?.emotion || 'peaceful';
  const config = EMOTION_CONFIG[emotion] || EMOTION_CONFIG.peaceful;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleShare = async () => {
    try {
      const poem = result?.poem || '';
      const emotionLabel = config.label;
      await Share.share({
        message: `${config.emoji} ${emotionLabel}\n\n${poem}\n\n—— 来自「茶海心遇」`,
        title: '茶海心遇 · 心语分享',
      });
    } catch (error) {
      console.warn('Share failed:', error);
    }
  };

  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          },
        ]}
      >
        {/* Emotion Badge */}
        <View style={[styles.emotionBadge, { backgroundColor: config.color + '20' }]}>
          <Text style={styles.emotionEmoji}>{config.emoji}</Text>
          <Text style={[styles.emotionLabel, { color: config.color }]}>
            {config.label}
          </Text>
        </View>

        {/* AI Image */}
        {result?.imageUrl && (
          <View style={styles.imageCard}>
            {imageLoading && (
              <View style={styles.imageLoading}>
                <ActivityIndicator size="large" color={config.color} />
                <Text style={styles.imageLoadingText}>画作生成中...</Text>
              </View>
            )}
            <Image
              source={{ uri: result.imageUrl }}
              style={[styles.image, imageError && { display: 'none' }]}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
            {imageError && (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderEmoji}>{config.emoji}</Text>
                <Text style={styles.imagePlaceholderText}>画作加载失败</Text>
              </View>
            )}
            <View
              style={[styles.imageAccent, { backgroundColor: config.color }]}
            />
          </View>
        )}

        {!result?.imageUrl && (
          <View style={styles.imageCard}>
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderEmoji}>{config.emoji}</Text>
              <Text style={styles.imagePlaceholderText}>心境画作</Text>
            </View>
          </View>
        )}

        {/* Poem */}
        {result?.poem && (
          <View style={[styles.poemCard, { borderLeftColor: config.color }]}>
            <Text style={styles.poemTitle}>🍵 心语诗句</Text>
            <Text style={styles.poemText}>{result.poem}</Text>
          </View>
        )}

        {/* Original Text */}
        {result?.originalText && (
          <View style={styles.originalCard}>
            <Text style={styles.originalTitle}>原始心情</Text>
            <Text style={styles.originalText}>{result.originalText}</Text>
          </View>
        )}

        {/* Audio Player */}
        {result?.audioUrl && (
          <View style={styles.audioSection}>
            <Text style={styles.sectionTitle}>🎵 心语朗读</Text>
            <AudioPlayer uri={result.audioUrl} color={config.color} />
          </View>
        )}

        {/* Share Button */}
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: config.color }]}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Text style={styles.shareButtonText}>分享心语</Text>
        </TouchableOpacity>

        {/* Metadata */}
        {result?.createdAt && (
          <Text style={styles.timestamp}>
            {new Date(result.createdAt).toLocaleString('zh-CN')}
          </Text>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
  },
  emotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginBottom: 24,
  },
  emotionEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  emotionLabel: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
  imageCard: {
    width: SCREEN_WIDTH - 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    marginBottom: 24,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: SCREEN_WIDTH - 40,
    borderRadius: 20,
  },
  imageLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: COLORS.card,
  },
  imageLoadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  imagePlaceholderEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  imagePlaceholderText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  imageAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  poemCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 22,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  poemTitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 14,
    fontWeight: '600',
  },
  poemText: {
    fontSize: 18,
    color: COLORS.text,
    lineHeight: 32,
    letterSpacing: 1,
    fontWeight: '400',
  },
  originalCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  originalTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
    fontWeight: '500',
  },
  originalText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  audioSection: {
    width: '100%',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
  },
  shareButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 2,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
