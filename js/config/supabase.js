/* Configuración pública del cliente Supabase. RLS protege user_state. */
const SUPABASE_URL = 'https://mpbvrhlwlduyglkevfyw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_g9TKMooZ407VSI01od3JRw_4hvh1ZEm'; // publishable/anon, seguro para el cliente (protegido por RLS)
const AUTH_SESSION_KEY = 'made2run_v2_auth_session'; // clave separada de made2run_v2_users a propósito: es una sesión, no datos de entrenamiento
