// Public browser configuration only. The Supabase anon/publishable key is designed
// for browser use; protect every table with row-level security. Never put a service
// role key or third-party integration secret in this file.
window.DVAS_CONFIG = {
  supabaseUrl: '',       // e.g. https://your-project.supabase.co
  supabaseAnonKey: '',   // Supabase publishable/anon key
  organizationId: ''     // organization UUID created during secure admin bootstrap
};
