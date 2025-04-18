import { useEffect, useCallback } from 'react';
import realtimeSubscriptions from '../lib/realtimeSubscriptions';
import supabase from '../lib/supabase';

/**
 * Hook to easily use real-time subscriptions in any component
 * @param {string} componentName - Unique name for the component using this hook
 * @param {Object} options - Configuration options
 * @returns {Object} Helper functions for real-time data
 */
const useRealtime = (componentName, options = {}) => {
  const {
    tables = [],
    autoRefreshTables = [],
    refreshCallback = null,
  } = options;

  // Process real-time update
  const handleRealtimeUpdate = useCallback(async (table, payload) => {
    // If this table should trigger a refresh, call the refresh callback
    if (autoRefreshTables.includes(table) && refreshCallback) {
      refreshCallback(table, payload);
    }
  }, [autoRefreshTables, refreshCallback]);

  // Subscribe to specified tables when component mounts
  useEffect(() => {
    const listenerIds = [];

    // Subscribe to each requested table
    tables.forEach(table => {
      const listenerId = realtimeSubscriptions.addListener(
        componentName,
        table,
        '*',
        (payload) => handleRealtimeUpdate(table, payload)
      );
      listenerIds.push(listenerId);
    });

    // Cleanup subscriptions when component unmounts
    return () => {
      realtimeSubscriptions.removeComponentListeners(componentName);
    };
  }, [componentName, tables, handleRealtimeUpdate]);

  // Fetch updated record after a change
  const fetchUpdatedRecord = useCallback(async (table, id) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching updated ${table} record:`, error);
      return null;
    }
  }, []);

  // Function to manually subscribe to a specific table
  const subscribeToTable = useCallback((table, eventType = '*', callback) => {
    const listenerId = realtimeSubscriptions.addListener(
      componentName,
      table,
      eventType,
      callback
    );
    return listenerId;
  }, [componentName]);

  // Function to manually unsubscribe
  const unsubscribe = useCallback((listenerId) => {
    realtimeSubscriptions.removeListener(listenerId);
  }, []);

  return {
    subscribeToTable,
    unsubscribe,
    fetchUpdatedRecord,
  };
};

export default useRealtime; 