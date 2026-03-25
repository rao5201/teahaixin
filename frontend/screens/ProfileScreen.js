import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  danger: '#E74C3C',
};

const EMOTION_CONFIG = {
  happy: { color: '#FFD700', emoji: '😊', label: '开心' },
  sad: { color: '#4A90E2', emoji: '😢', label: '悲伤' },
  angry: { color: '#E74C3C', emoji: '😠', label: '愤怒' },
  peaceful: { color: '#2ECC71', emoji: '😌', label: '平静' },
  anxious: { color: '#95A5A6', emoji: '😰', label: '焦虑' },
  romantic: { color: '#FF69B4', emoji: '😍', label: '浪漫' },
};

export default function ProfileScreen() {
  const { token, user, signOut } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, mainEmotion: null });

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [historyRes, reportRes] = await Promise.allSettled([
        axios.get(`${API_URL}/user/history`, { headers, timeout: 10000 }),
        axios.get(`${API_URL}/user/weekly-report`, { headers, timeout: 10000 }),
      ]);

      if (historyRes.status === 'fulfilled') {
        const records = historyRes.value.data?.records || historyRes.value.data || [];
        setHistory(records);

        // Calculate stats
        const total = records.length;
        const emotionCounts = {};
        records.forEach((r) => {
          const e = r.emotion || 'peaceful';
          emotionCounts[e] = (emotionCounts[e] || 0) + 1;
        });
        let mainEmotion = null;
        let maxCount = 0;
        Object.entries(emotionCounts).forEach(([key, count]) => {
          if (count > maxCount) {
            mainEmotion = key;
            maxCount = count;
          }
        });
        setStats({ total, mainEmotion });
      }

      if (reportRes.status === 'fulfilled') {
        setWeeklyReport(reportRes.value.data?.report || reportRes.value.data || null);
      }
    } catch (err) {
      console.warn('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  const renderUserInfo = () => {
    const mainConfig = stats.mainEmotion
      ? EMOTION_CONFIG[stats.mainEmotion]
      : null;

    return (
      <View style={styles.userSection}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0)?.toUpperCase() || '茶'}
            </Text>
          </View>
          <Text style={styles.username}>{user?.username || '茶友'}</Text>
          {user?.email && (
            <Text style={styles.email}>{user.email}</Text>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>心语记录</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            {mainConfig ? (
              <>
                <Text style={styles.statValue}>
                  {mainConfig.emoji}
                </Text>
                <Text style={styles.statLabel}>{mainConfig.label}</Text>
              </>
            ) : (
              <>
                <Text style={styles.statValue}>-</Text>
                <Text style={styles.statLabel}>主要情绪</Text>
              </>
            )}
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {history.length > 0
                ? Math.ceil(
                    (new Date() - new Date(history[history.length - 1]?.createdAt || Date.now())) /
                      86400000
                  )
                : 0}
            </Text>
            <Text style={styles.statLabel}>使用天数</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderWeeklyReport = () => {
    if (!weeklyReport) return null;

    return (
      <View style={styles.reportCard}>
        <Text style={styles.reportTitle}>📊 本周心情报告</Text>
        {weeklyReport.summary && (
          <Text style={styles.reportText}>{weeklyReport.summary}</Text>
        )}
        {weeklyReport.dominantEmotion && (
          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>主导情绪</Text>
            <Text style={styles.reportValue}>
              {EMOTION_CONFIG[weeklyReport.dominantEmotion]?.emoji || '😌'}{' '}
              {EMOTION_CONFIG[weeklyReport.dominantEmotion]?.label || weeklyReport.dominantEmotion}
            </Text>
          </View>
        )}
        {weeklyReport.suggestion && (
          <View style={styles.reportSuggestion}>
            <Text style={styles.reportSuggestionTitle}>💡 建议</Text>
            <Text style={styles.reportSuggestionText}>
              {weeklyReport.suggestion}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderHistoryItem = ({ item }) => {
    const config = EMOTION_CONFIG[item.emotion] || EMOTION_CONFIG.peaceful;
    const date = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <View style={styles.historyCard}>
        <View style={styles.historyLeft}>
          <View style={[styles.historyDot, { backgroundColor: config.color }]} />
          <View style={styles.historyLine} />
        </View>
        <View style={styles.historyContent}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyEmoji}>{config.emoji}</Text>
            <Text style={[styles.historyEmotion, { color: config.color }]}>
              {config.label}
            </Text>
            <Text style={styles.historyDate}>{date}</Text>
          </View>
          {item.text && (
            <Text style={styles.historyText} numberOfLines={2}>
              {item.text}
            </Text>
          )}
          {item.poem && (
            <Text style={styles.historyPoem} numberOfLines={1}>
              「{item.poem}」
            </Text>
          )}
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {renderUserInfo()}
      {renderWeeklyReport()}
      {history.length > 0 && (
        <Text style={styles.historySectionTitle}>📝 心语历史</Text>
      )}
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footer}>
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>
      <Text style={styles.version}>茶海心遇 v1.0.0</Text>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      {!loading && (
        <>
          <Text style={styles.emptyEmoji}>🍃</Text>
          <Text style={styles.emptyText}>还没有心语记录</Text>
          <Text style={styles.emptySubtext}>去首页写下您的第一条心情吧</Text>
        </>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
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
  userSection: {
    marginBottom: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: 1,
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
  },
  reportCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
    letterSpacing: 1,
  },
  reportText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 14,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  reportLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  reportValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  reportSuggestion: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  reportSuggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  reportSuggestionText: {
    fontSize: 14,
    color: COLORS.primaryLight,
    lineHeight: 22,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: 1,
  },
  historyCard: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  historyLeft: {
    alignItems: 'center',
    width: 24,
    marginRight: 14,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  historyLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginTop: -2,
  },
  historyContent: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  historyEmotion: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 'auto',
  },
  historyText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  historyPoem: {
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
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginBottom: 20,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
  version: {
    fontSize: 12,
    color: COLORS.textSecondary,
    opacity: 0.6,
  },
});
