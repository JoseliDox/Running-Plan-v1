const runtimeScripts = [
  './js/engine/prescription-engine.js',
  './js/races/multi-race.js',
  './js/state/state-model.js',
  './js/config/supabase.js',
  './js/auth/supabase-auth.js',
  './js/state/persistence.js',
  './js/workouts/workouts.js',
  './js/ui/ui.js',
];

for (const src of runtimeScripts) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar '+src));
    document.head.appendChild(script);
  });
}
