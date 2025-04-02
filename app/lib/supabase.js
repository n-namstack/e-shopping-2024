import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a single supabase client for interacting with your database
const supabaseUrl = 'https://wwfhaxdvizqzaqrnusiz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZmhheGR2aXpxemFxcm51c2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NTU4NjgsImV4cCI6MjA1OTAzMTg2OH0.q5Q7nPzd-IQfzo30c4MWSoJawF1KB4QBnUsLhNZUDsg';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase; 