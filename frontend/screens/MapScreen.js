import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App';

const API_URL = 'http://localhost:3001/api';

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
  happy: { color: '#FFD700', emoji: '😊', label: '开心' },
  sad: { color: '#4A90E2', emoji: '😢', label: '悲伤' },
  angry: { color: '#E74C3C', emoji: '😠', label: '愤怒' },
  peaceful: { color: '#2ECC71', emoji: '😌', label: '平静' },
  anxious: { color: '#95A5A6', emoji: '😰', label: '焦虑' },
  romantic: { color: '#FF69B4', emoji: '😍', label: '浪漫' },
};

const EMOTION_KEYS = Object.keys(EMOTION_CONFIG);

export default function MapScreen() {
  const { token } = useContext(AuthContext);
  const [stats, setStats] = useState({});
  const [nearbyEmotions, setNearbyEmotions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [statsRes, nearbyRes] = await Promise.allSettled([
        axios.get(`${API_URL}/emotions/stats`, { headers, timeout: 10000 }),
        axios.get(`${API_URL}/emotions/nearby`, { headers, timeout: 10000 }),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.stats || statsRes.value.data || {});
      }

      if (nearbyRes.status === 'fulfilled') {
        setNearbyEmotions(nearbyRes.value.data?.emotions || nearbyRes.value.data || []);
      }

      if (statsRes.status === 'rejected' && nearbyRes.status === 'rejected') {
        setError('无法加载数据，请检查网络连接');
      }
    } catch (err) {
      setError('加载失败，下拉刷新重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const getTotalCount = () => {
    return EMOTION_KEYS.reduce((sum, key) => sum + (stats[key] || 0), 0);
  };

  const renderStatsGrid = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🗺️ 情绪地图</Text>
      <Text style={styles.sectionSubtitle}>
        共 {getTotalCount()} 条情绪记录
      </Text>
      <View style={styles.statsGrid}>
        {EMOTION_KEYS.map((key) => {
          const config = EMOTION_CONFIG[key];
          const count = stats[key] || 0;
          const total = getTotalCount() || 1;
          const percentage = Math.round((count / total) * 100);

          return (
            <View key={key} style={styles.statCard}>
              <Text style={styles.statEmoji}>{config.emoji}</Text>
              <Text style={[styles.statCount, { color: config.color }]}>
                {count}
              </Text>
              <Text style={styles.statLabel}>{config.label}</Text>
              <View style={styles.statBar}>
                <View
                  style={[
                    styles.statBarFill,
                    {
                      backgroundColor: config.color,
                      width: `${Math.max(percentage, 5)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.statPercent}>{percentage}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderNearbyItem = ({ item }) => {
    const config = EMOTION_CONFIG[item.emotion] || EMOTION_CONFIG.peaceful;
    const timeAgo = item.createdAt
      ? getTimeAgo(new Date(item.createdAt))
      : '';

    return (
      <View style={styles.nearbyCard}>
        <View style={[styles.nearbyDot, { backgroundColor: config.color }]} />
        <View style={styles.nearbyContent}>
          <View style={styles.nearbyHeader}>
            <Text style={styles.nearbyEmoji}>{config.emoji}</Text>
            <Text style={[styles.nearbyEmotion, { color: config.color }]}>
              {config.label}
            </Text>
            {timeAgo ? (
              <Text style={styles.nearbyTime}>{timeAgo}</Text>
            ) : null}
          </View>
          {item.text && (
            <Text style={styles.nearbyText} numberOfLines={2}>
              {item.text}
            </Text>
          )}
          {item.poem && (
            <Text style={styles.nearbyPoem} numberOfLines={1}>
              「{item.poem}」
            </Text>
          )}
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {renderStatsGrid()}
      {nearbyEmotions.length > 0 && (
        <Text style={styles.nearbySectionTitle}>📍 附近的心语</Text>
      )}
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      {!loading && (
        <>
          <Text style={styles.emptyEmoji}>🍃</Text>
          <Text style={styles.emptyText}>
            {error || '暂无附近的情绪记录'}
          </Text>
          <Text style={styles.emptySubtext}>去首页写下您的心情吧</Text>
        </>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>加载情绪地图...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={nearbyEmotions}
        renderItem={renderNearbyItem}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            progressBackgroundColor={COLORS.card}
          />
        }
      />
    </View>
  );
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHr < 24) return `${diffHr}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  statCount: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
    fontWeight: '500',
  },
  statBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.background,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  statBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  statPercent: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  nearbySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: 1,
  },
  nearbyCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nearbyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 14,
  },
  nearbyContent: {
    flex: 1,
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nearbyEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  nearbyEmotion: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  nearbyTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 'auto',
  },
  nearbyText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  nearbyPoem: {
    fontSize: 13,
    color: COLORS.primaryLight,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    opacity: 0.7,
  },
});
