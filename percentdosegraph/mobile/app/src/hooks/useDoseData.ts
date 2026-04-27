import { useState, useEffect } from 'react';
import { apiClient } from '@shared/api/apiClient';

interface Drug {
  id: string | number;
  name: string;
  maxDailyDose: number;
  unit: string;
  drugClass?: string;
}

interface Dose {
  id: string | number;
  drugId: string | number;
  date: string;
  amount: number;
  route: string;
}

export function useDoseData() {
  const [doses, setDoses] = useState<Dose[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [drugsData, dosesData] = await Promise.all([
          apiClient.getDrugs(),
          apiClient.getDoses(),
        ]);
        setDrugs(drugsData);
        setDoses(dosesData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('Error fetching dose data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { doses, drugs, loading, error };
}
