function launchScenario() {
    introJs()
    .onchange(function(targetElement) {  
        switch (targetElement.id) 
            { 
            case "startAddressBlock": 
                chooseRoutingMode('shortestPath');
            break; 
            case "destinationAddressBlock": 
                document.getElementById('startField').value="8 Grande Rue Nazareth, Toulouse";
                document.getElementById("destinationAddress").style.display = "block";
                setStart();
            break; 
            case "iconsCTBlock":
                document.getElementById('destinationField').value="1 Rue des Cuves Saint-Sernin, Toulouse";
                document.getElementById("costType").style.display = "block";
                setDestination();
                map.setView(new L.LatLng(43.602, 1.445),15);
            break;
            case "routeLengthBlock": 
                chooseRoute('cost_culture');
            break;
            case "btnCircular": 
                chooseRoutingMode('circular');
            break; 
            case "iconsCTCircularBlock": 
                document.getElementById('startFieldCircular').value="36 Rue Saint-Rémésy, Toulouse";
                document.getElementById("costTypeCircular").style.display = "block";
                document.getElementById("circularLengthPrompt").style.display = "block";
                setStartCircular();
                map.setView(new L.LatLng(43.597, 1.443),14);
            break; 
            case "step10": 
                chooseRouteCircular('cost_nature');
            break; 
            case "introText": 
                document.getElementById('circularLengthField').value="90";
                circularLengthSet();
            break; 
            }
    })
    .start()
    .onexit(function() {
    $.cookie('showIntro', 'false', {expire : 365});
    });
}


if ($.cookie('showIntro') != 'false') {
    $(document).ready(function() {
        launchScenario();
    });
};