$(document).ready(function() {
    introJs().onchange(function(targetElement) {  
    console.log(targetElement.id); 
        switch (targetElement.id) 
            { 
            case "step3": 
                chooseRoutingMode('shortestPath');
            break; 
            case "step4": 
                document.getElementById('startField').value="8 Grande Rue Nazareth, Toulouse";
                document.getElementById("destinationAddress").style.display = "block";
                setStart();
            break; 
            case "btnGroupCostType": 
                console.log("in");
                document.getElementById('destinationField').value="1 Rue des Cuves Saint-Sernin, Toulouse";
                document.getElementById("costType").style.display = "block";
                setDestination();
            break; 
            }
    }).start();
});


