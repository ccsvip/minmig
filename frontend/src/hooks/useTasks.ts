import { useState, useEffect, useCallback } from 'react';
import client, { MigrationTask } from '../api/client';

export function useTasks() {
  const [tasks, setTasks] = useState<MigrationTask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/migrations');
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const subscribeProgress = useCallback((taskId: number, onProgress: (data: any) => void) => {
    const token = localStorage.getItem('token');
    const es = new EventSource(`/api/migrations/${taskId}/progress?token=${token}`);
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === '__done__') {
        es.close();
        fetch();
        return;
      }
      if (data.status === 'keepalive') return;
      onProgress(data);
      // Refresh tasks when state changes
      if (['completed', 'failed', 'cancelled'].includes(data.status)) {
        fetch();
      }
    };
    es.onerror = () => {
      es.close();
      fetch();
    };
    return () => es.close();
  }, [fetch]);

  return { tasks, loading, fetch, subscribeProgress };
}
