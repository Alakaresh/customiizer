(function(){
    function getParam(name){
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }
    const ref = getParam('ref');
    if (ref) {
        try {
            localStorage.setItem('customiizer_referrer', ref);
        } catch (e) {}
    }
})();
