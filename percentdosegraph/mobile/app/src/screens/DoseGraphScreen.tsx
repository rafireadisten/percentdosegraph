import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useDoseData } from '@/hooks/useDoseData';

const COLORS = {
  primary: '#0e7a6d',
  background: '#f6f1e8',
  surface: '#ffffff',
  text: '#1f2a2e',
  muted: '#66757a',
};

export default function DoseGraphScreen() {
  const { doses, drugs, loading, error } = useDoseData();
  const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dose Timeline</Text>
        <Text style={styles.subtitle}>
          View medication doses as % of maximum daily dose
        </Text>
      </View>

      {/* Graph placeholder - integrate with native chart library */}
      <View style={styles.graphContainer}>
        <Text style={styles.placeholder}>Graph component placeholder</Text>
      </View>

      {/* Drug selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medications</Text>
        {drugs.map((drug) => (
          <View key={drug.id} style={styles.drugItem}>
            <Text style={styles.drugName}>{drug.name}</Text>
            <Text style={styles.drugDetails}>
              Max: {drug.maxDailyDose} {drug.unit}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
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
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
  },
  graphContainer: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    height: 300,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  placeholder: {
    color: COLORS.muted,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  drugItem: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 6,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  drugName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  drugDetails: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  errorText: {
    color: '#c33',
    fontSize: 16,
  },
});
