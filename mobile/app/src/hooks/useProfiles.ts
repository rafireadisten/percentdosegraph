import { useState, useCallback } from 'react';
import { apiClient } from '@shared/api/apiClient';

interface Profile {
  id: string;
  label: string;
  drugCount: number;
  eventCount: number;
  createdAt: string;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getProfiles();
      setProfiles(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
      console.error('Error loading profiles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProfile = useCallback(
    async (profile: Omit<Profile, 'id' | 'createdAt'>) => {
      try {
        const newProfile = await apiClient.createProfile(profile);
        setProfiles((prev) => [...prev, newProfile]);
        return newProfile;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to save profile');
      }
    },
    []
  );

  return { profiles, loading, error, loadProfiles, saveProfile };
}
