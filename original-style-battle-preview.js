(()=>{
  var BASE_W = 1536;
  var BASE_H = 1024;
  var shell = document.getElementById('shell');
  var debugEnabled = new URLSearchParams(location.search).get('debug') === '1';

  function applyScale(){
    if(!shell) return;
    var scale = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
    var offsetX = Math.round((window.innerWidth - BASE_W * scale) / 2);
    var offsetY = Math.round((window.innerHeight - BASE_H * scale) / 2);
    shell.style.transform = 'scale(' + scale + ')';
    shell.style.left = offsetX + 'px';
    shell.style.top = offsetY + 'px';
  }

  function setDebug(next){
    debugEnabled = !!next;
    document.body.classList.toggle('debug', debugEnabled);
  }

  window.addEventListener('resize', applyScale);
  window.addEventListener('keydown', function(evt){
    if(evt.key === 'd' || evt.key === 'D'){
      setDebug(!debugEnabled);
    }
  });

  setDebug(debugEnabled);
  applyScale();
})();
