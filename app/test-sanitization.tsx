/**
 * Test Sanitization Screen
 * 
 * Access this screen to test input sanitization
 * Route: /test-sanitization
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { sanitizeName, sanitizeEmail, sanitizeUserProfile, sanitizeString } from '@/utils/sanitize';
import { updateUserProfile } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { runSanitizationTests } from '@/utils/testSanitization';

export default function TestSanitizationScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [testInput, setTestInput] = useState('');
  const [result, setResult] = useState('');
  const [testResults, setTestResults] = useState('');

  const testSanitization = () => {
    const sanitized = sanitizeUserProfile({ 
      name, 
      email, 
      occupation 
    });
    setResult(JSON.stringify(sanitized, null, 2));
  };

  const testSingleInput = () => {
    const sanitized = sanitizeName(testInput);
    setResult(`Input: ${testInput}\n\nSanitized: ${sanitized}`);
  };

  const runAllTests = () => {
    // Capture console.log output
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    
    runSanitizationTests();
    
    console.log = originalLog;
    setTestResults(logs.join('\n'));
  };

  const saveToProfile = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert('Error', 'You must be signed in to test profile updates');
      return;
    }

    try {
      const sanitized = sanitizeUserProfile({ name, email, occupation });
      // Convert to proper UserProfile type (remove null values)
      const profileUpdate: Partial<import('@/services/userService').UserProfile> = {};
      if (sanitized.name) profileUpdate.name = sanitized.name;
      if (sanitized.occupation) profileUpdate.occupation = sanitized.occupation;
      
      await updateUserProfile(user.uid, profileUpdate);
      Alert.alert(
        'Success', 
        'Profile updated! Check Firestore to verify sanitization.\n\n' +
        `Name: ${sanitized.name || 'N/A'}\n` +
        `Occupation: ${sanitized.occupation || 'N/A'}`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Test Input Sanitization</Text>
      </View>

      {/* Quick Test Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Test</Text>
        <Text style={styles.sectionSubtitle}>
          Enter malicious input to test sanitization
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Test input (e.g., <script>alert('XSS')</script>)"
          placeholderTextColor={colors.textMuted}
          value={testInput}
          onChangeText={setTestInput}
        />
        
        <Pressable style={styles.testButton} onPress={testSingleInput}>
          <Text style={styles.testButtonText}>Test Input</Text>
        </Pressable>
      </View>

      {/* Profile Test Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Sanitization Test</Text>
        <Text style={styles.sectionSubtitle}>
          Test with user profile fields
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Name (try: <script>alert('XSS')</script>John)"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Occupation"
          placeholderTextColor={colors.textMuted}
          value={occupation}
          onChangeText={setOccupation}
        />
        
        <View style={styles.buttonRow}>
          <Pressable style={styles.testButton} onPress={testSanitization}>
            <Text style={styles.testButtonText}>Test Sanitization</Text>
          </Pressable>
          
          {isAuthenticated && (
            <Pressable style={styles.saveButton} onPress={saveToProfile}>
              <Text style={styles.saveButtonText}>Save to Profile</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Automated Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Automated Tests</Text>
        <Text style={styles.sectionSubtitle}>
          Run all predefined test cases
        </Text>
        
        <Pressable style={styles.runTestsButton} onPress={runAllTests}>
          <Ionicons name="play-circle" size={20} color={colors.primary} />
          <Text style={styles.runTestsButtonText}>Run All Tests</Text>
        </Pressable>
      </View>

      {/* Results */}
      {(result || testResults) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Results</Text>
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>
              {testResults || result}
            </Text>
          </View>
        </View>
      )}

      {/* Test Cases Reference */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Cases to Try</Text>
        <View style={styles.testCasesContainer}>
          <Text style={styles.testCase}>
            • {'<script>alert("XSS")</script>'}
          </Text>
          <Text style={styles.testCase}>
            • {'<img src=x onerror=alert(1)>'}
          </Text>
          <Text style={styles.testCase}>
            • javascript:alert("XSS")
          </Text>
          <Text style={styles.testCase}>
            • John{'<script>alert(1)</script>'}Doe
          </Text>
          <Text style={styles.testCase}>
            • {'<div onclick="alert(1)">Click</div>'}
          </Text>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Verify</Text>
        <Text style={styles.instruction}>
          1. Enter malicious input above{'\n'}
          2. Click "Test Sanitization" to see sanitized output{'\n'}
          3. Click "Save to Profile" to test with Firestore{'\n'}
          4. Check Firebase Console → Firestore → users collection{'\n'}
          5. Verify no HTML/script tags are stored
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    marginRight: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  section: {
    marginBottom: spacing.xl,
    padding: spacing.base,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  testButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  testButtonText: {
    color: colors.textInverse,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  saveButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  runTestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  runTestsButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  testCasesContainer: {
    gap: spacing.xs,
  },
  testCase: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  instruction: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

