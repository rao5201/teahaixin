import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
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
  inputBg: '#16162a',
};

const MAX_CHARS = 500;

const EMOTION_HINTS = [
  { text: '今天心情不错，阳光很好', emoji: '☀️' },
  { text: '有些疲惫，想要放松一下', emoji: '🌙' },
  { text: '感到焦虑，不知道该怎么办', emoji: '🌊' },
  { text: '思念远方的朋友', emoji: '🍃' },
];

export default function HomeScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmpty = text.trim().length === 0;

  const handleGenerate = async () => {
    if (isEmpty) {
      Alert.alert('提示', '请先写下您此刻的心情');
      return;
    }
    if (isOverLimit) {
      Alert.alert('提示', `文字不能超过${MAX_CHARS}个字符`);
      return;
    }

    setLoading(true);
    try {
      const endpoint = token ? '/generate/save' : '/generate';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(
        `${API_URL}${endpoint}`,
        { text: text.trim() },
        { headers, timeout: 30000 }
      );

      const result = response.data;
      navigation.navigate('Result', { result });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        '生成失败，请稍后重试';
      Alert.alert('错误', message);
    } finally {
      setLoading(false);
    }
  };

  const applyHint = (hint) => {
    setText(hint);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🍵</Text>
          <Text style={styles.headerTitle}>写下此刻心情</Text>
          <Text style={styles.headerSubtitle}>
            让AI为您生成专属心语、诗句与画作
          </Text>
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <TextInput
            style={styles.textInput}
            placeholder="此刻，您在想些什么..."
            placeholderTextColor={COLORS.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={MAX_CHARS + 50}
            textAlignVertical="top"
            autoCorrect={false}
          />

          {/* Character Counter */}
          <View style={styles.counterRow}>
            <Text
              style={[
                styles.counterText,
                isOverLimit && styles.counterTextError,
              ]}
            >
              {charCount}/{MAX_CHARS}
            </Text>
          </View>
        </View>

        {/* Hints */}
        <View style={styles.hintsSection}>
          <Text style={styles.hintsTitle}>不知道写什么？试试这些：</Text>
          <View style={styles.hintsGrid}>
            {EMOTION_HINTS.map((hint, index) => (
              <TouchableOpacity
                key={index}
                style={styles.hintChip}
                onPress={() => applyHint(hint.text)}
                activeOpacity={0.7}
              >
                <Text style={styles.hintEmoji}>{hint.emoji}</Text>
                <Text style={styles.hintText} numberOfLines={1}>
                  {hint.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            (isEmpty || isOverLimit || loading) && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={isEmpty || isOverLimit || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.generateButtonText}>  心语生成中...</Text>
            </View>
          ) : (
            <Text style={styles.generateButtonText}>🍵 生成心语</Text>
          )}
        </TouchableOpacity>

        {!token && (
          <Text style={styles.guestNote}>
            当前为游客模式，登录后可保存生成记录
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textInput: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 26,
    minHeight: 160,
    maxHeight: 240,
    paddingTop: 0,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  counterText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  counterTextError: {
    color: '#E74C3C',
  },
  hintsSection: {
    marginBottom: 28,
  },
  hintsTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  hintsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  hintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: '48%',
  },
  hintEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  hintText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestNote: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
});
