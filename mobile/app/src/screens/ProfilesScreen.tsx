import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useProfiles } from '@/hooks/useProfiles';

const COLORS = {
  primary: '#0e7a6d',
  background: '#f6f1e8',
  surface: '#ffffff',
  text: '#1f2a2e',
  muted: '#66757a',
};

export default function ProfilesScreen() {
  const router = useRouter();
  const { profiles, loading, error, loadProfiles } = useProfiles();

  useEffect(() => {
    loadProfiles();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const handleProfilePress = (profileId: string) => {
    router.push({
      pathname: '/profile-detail',
      params: { id: profileId },
    });
  };

  const handleNewProfile = () => {
    router.push('/profile-detail');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Profiles</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleNewProfile}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.profileCard}
            onPress={() => handleProfilePress(item.id)}
          >
            <View style={styles.profileContent}>
              <Text style={styles.profileName}>{item.label}</Text>
              <Text style={styles.profileMeta}>
                {item.drugCount} drug(s) • {item.eventCount} event(s)
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No profiles yet</Text>
            <Text style={styles.emptySubtext}>
              Create one to get started
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  profileContent: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  profileMeta: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 6,
  },
});
