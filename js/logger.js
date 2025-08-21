(function(){
  function getCookie(name){
    const match = document.cookie.match(new RegExp('(?:^|; )'+name.replace(/([.$?*|{}()\[\]\\\/\+^])/g,'\\$1')+'=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }
  function getUserId(){
    return window.USER_ID || localStorage.getItem('userId') || getCookie('userId');
  }
  function getSessionId(){
    return window.SESSION_ID || localStorage.getItem('sessionId') || getCookie('sessionId');
  }
  const apiUrl = (window.THEME_URI || '') + '/api/log_client.php';
  let currentRequestId = null;

  function send(level, message, extra){
    let reqId = currentRequestId;
    if (extra && typeof extra === 'object' && extra.requestId) {
      reqId = extra.requestId;
      extra = Object.assign({}, extra);
      delete extra.requestId;
    }
    const payload = {
      level: level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      extra: extra || {},
      userId: getUserId(),
      sessionId: getSessionId()
    };
    if (reqId) {
      payload.requestId = reqId;
    }
    try {
      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch(e){
      console.error('Logger send error', e);
    }
  }
  window.logger = {
    log: function(){
      var args = Array.prototype.slice.call(arguments);
      var levels = ['info','warn','error','debug'];
      var level = args[0];
      if(levels.indexOf(level) === -1){
        level = 'info';
      } else {
        args.shift();
      }
      var message = args.shift();
      var extra = args.length > 0 ? (args.length === 1 ? args[0] : args) : undefined;
      send(level, message, extra);
    },
    setRequestId: function(id){
      currentRequestId = id;
    }
  };
  window.addEventListener('error', function(e){
    send('error', e.message, {
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error && e.error.stack
    });
  });
  document.addEventListener('click', function(e){
    const target = e.target;
    send('info', 'click', {
      tag: target.tagName,
      id: target.id,
      classes: Array.from(target.classList || []),
      x: e.clientX,
      y: e.clientY
    });
  });
})();
