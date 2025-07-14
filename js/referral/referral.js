(function(){
    function getParam(name){
        const params=new URLSearchParams(window.location.search);
        return params.get(name);
    }
    function setCookie(name,value,days){
        const d=new Date();
        d.setTime(d.getTime()+days*24*60*60*1000);
        document.cookie=name+'='+encodeURIComponent(value)+'; expires='+d.toUTCString()+'; path=/';
    }
    const ref=getParam('ref');
    if(ref){
        setCookie('customiizer_referrer', ref, 7);
    }
})();
