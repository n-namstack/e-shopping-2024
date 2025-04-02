import supabase from '../lib/supabase';

// File upload helper
export const uploadFile = async (file, bucket, path = '') => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
      
    if (error) throw error;
    
    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
      
    return { url: publicUrlData.publicUrl, path: fileName };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Multiple file upload helper
export const uploadMultipleFiles = async (files, bucket, path = '') => {
  try {
    const uploadPromises = files.map(file => uploadFile(file, bucket, path));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple files:', error);
    throw error;
  }
};

// Delete file helper
export const deleteFile = async (path, bucket) => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Real-time subscription helper
export const subscribeToChanges = (table, callback, filters = {}) => {
  let subscription = supabase
    .channel(`public:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
      callback(payload);
    })
    .subscribe();
    
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(subscription);
  };
};

// Error handler helper
export const handleSupabaseError = (error) => {
  if (error.code === 'PGRST116') {
    return { message: 'Resource not found' };
  }
  
  if (error.code === '23505') {
    return { message: 'Duplicate entry found' };
  }
  
  return { message: error.message || 'An unexpected error occurred' };
};

// Transform Supabase timestamp to readable date
export const formatSupabaseDate = (timestamp, options = {}) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return date.toLocaleDateString(options.locale || 'en-US', options.dateOptions || {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Transform Supabase timestamp to readable date and time
export const formatSupabaseDateTime = (timestamp, options = {}) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return date.toLocaleString(options.locale || 'en-US', options.dateOptions || {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default {
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
  subscribeToChanges,
  handleSupabaseError,
  formatSupabaseDate,
  formatSupabaseDateTime,
}; 