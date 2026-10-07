/* Bootstrap de tema: aplica el tema guardado ANTES del primer paint para
   evitar parpadeos. F13: lee el tema del USUARIO ACTIVO dentro del
   contenedor multiusuario (única fuente de verdad, made2run_v2_users).
   Si aún no existe (primera carga antes de que main.js migre), usa
   dark/running por defecto; main.js recalculará el tema correcto nada
   más migrar, así que esto solo afecta al primerísimo arranque. */
(function(){
  try{
    var raw = localStorage.getItem('made2run_v2_users');
    var mode = 'dark', palette = 'running';
    if(raw){
      var store = JSON.parse(raw);
      var users = (store && Array.isArray(store.users)) ? store.users : [];
      var au = users.find(function(u){ return u.id===store.activeUserId; }) || users[0];
      var theme = au && au.f12State && au.f12State.theme;
      if(theme){ mode = theme.mode || mode; palette = theme.palette || palette; }
    }
    document.documentElement.setAttribute('data-mode', mode);
    document.documentElement.setAttribute('data-palette', palette);
  }catch(e){
    document.documentElement.setAttribute('data-mode','dark');
    document.documentElement.setAttribute('data-palette','running');
  }
})();
