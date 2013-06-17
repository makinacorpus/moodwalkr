// Walking speed. In km/h
var walkingSpeed=5; 

// To be prompted. In hours
var circularTime=1;

// Set a default value
var circularProfile="length";

map = new L.Map('map', {zoomControl:false});
// create the tile layer with correct attribution
var osmUrl='http://{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png';
var osmAttrib='Carte <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png"> Données <a href="http://www.openstreetmap.org/copyright">© Contributeurs OpenStreetMap</a>';
var subDomains = ['otile1','otile2','otile3','otile4'];
var osm = new L.TileLayer(osmUrl, {minZoom: 3, maxZoom: 18, attribution: osmAttrib, subdomains: subDomains});	

// Don't show the 'Powered by Leaflet' text	
map.attributionControl.setPrefix('');

// Zoom buttons position
var zoomp = new L.Control.Zoom({position: 'topright'});
zoomp.addTo(map);

// Start the map in Toulouse
map.addLayer(osm);
map.setView(new L.LatLng(43.6, 1.4),12);

// Route styles for display
var routeStyles = {
    "length":  {
        "color": "red",
        "weight": 5,
        "opacity": 0.5,
        "clickable": false
    },
    "cost_activity" : {
        "color": "blue",
        "weight": 5,
        "opacity": 0.5,
        "clickable": false
    },
    "cost_nature": {
        "color": "green",
        "weight": 5,
        "opacity": 0.5,
        "clickable": false
    },
    "cost_culture": {
        "color": "orange",
        "weight": 5,
        "opacity": 0.5,
        "clickable": false
    }
};

var markerRouteStyles = {
    "length": L.AwesomeMarkers.icon({icon: 'icon-arrow-right', color: 'red'}),
    "cost_activity" : L.AwesomeMarkers.icon({icon: 'icon-shopping-cart', color: 'blue'}),
    "cost_nature": L.AwesomeMarkers.icon({icon: 'icon-leaf', color: 'green'}),
    "cost_culture": L.AwesomeMarkers.icon({icon: 'icon-book', color: 'orange'})
};

// Layers
var routeLayers = {
    "length": "routeShortestLayer",
    "cost_activity": "routeActivityLayer",
    "cost_nature": "routeNatureLayer",
    "cost_culture": "routeCultureLayer"
};
var markerRouteLayers = {
    "length": "markerRouteShortestLayer",
    "cost_activity": "markerRouteActivityLayer",
    "cost_nature": "markerRouteNatureLayer",
    "cost_culture": "markerRouteCultureLayer"
};
		

// Markers        
var startMarker = L.AwesomeMarkers.icon({
    icon: 'icon-arrow-up', 
    color: 'cadetblue'
});

var stopMarker = L.AwesomeMarkers.icon({
    icon: 'icon-arrow-down', 
    color: 'cadetblue'
});

var c_startMarker = L.AwesomeMarkers.icon({
    icon: 'icon-repeat', 
    color: 'cadetblue'
});       


var markersList = {
    "start": {
        "marker": null,
        "markerIcon": startMarker
    },
    "stop": {
        "marker": null,
        "markerIcon": stopMarker
    },
    "c_start": {
        "marker": null,
        "markerIcon": c_startMarker
    }
};

// Length of the routes
var routeLengths = {
    "length": null,
    "cost_activity": null,
    "cost_nature": null,
    "cost_culture": null
};


function onEachFeature(feature, layer) {
	var popupContent =  feature.properties.popupContent;
	layer.bindPopup(popupContent);
}


var firstRoute = true;
var firstRouteInfo = true;
routeShortestLayer = undefined;
routeActivityLayer = undefined;
routeNatureLayer = undefined;
routeCultureLayer = undefined;
markerRouteShortestLayer = undefined;
markerRouteActivityLayer = undefined;
markerRouteNatureLayer = undefined;
markerRouteCultureLayer = undefined;


// Spin options
var opts = {
  lines: 13, // The number of lines to draw
  length: 20, // The length of each line
  width: 10, // The line thickness
  radius: 30, // The radius of the inner circle
  corners: 1, // Corner roundness (0..1)
  rotate: 0, // The rotation offset
  direction: 1, // 1: clockwise, -1: counterclockwise
  color: '#000', // #rgb or #rrggbb
  speed: 1, // Rounds per second
  trail: 60, // Afterglow percentage
  shadow: false, // Whether to render a shadow
  hwaccel: false, // Whether to use hardware acceleration
  className: 'spinner', // The CSS class to assign to the spinner
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  top: 'auto', // Top position relative to parent in px
  left: 'auto' // Left position relative to parent in px
};

// get the route according to the profile passed as argument
function computeRoute(profile,vlat1,vlon1,vlat2,vlon2) {
    map.spin(true,opts);
    var ajaxTime= new Date().getTime();
    $.ajax({
	    dataType: "json",
	    data: {
		    lat1: vlat1,
		    lon1: vlon1,
		    lat2: vlat2,
		    lon2: vlon2,
		    type: profile
	    },
	    url: '/route.json',
	    success: function(route) {
		    console.log(route.properties.profile);
                if (routeLayers[route.properties.profile] !== undefined) {
                    map.removeLayer(routeLayers[route.properties.profile]);
		            map.removeLayer(markerRouteLayers[route.properties.profile]);
                }
                routeLayers[route.properties.profile] = L.geoJson(route,
                                                                  {style: routeStyles[route.properties.profile],
                                                                  filter: function(feature, layer) {
                                                                          return (feature.geometry.type === "LineString")||(feature.geometry.type === "MultiLineString");
                                                                          }
                });
                markerRouteLayers[route.properties.profile] = L.geoJson(route, {
                                                                        pointToLayer: function (feature, latlng) {
								                                            return L.marker(latlng, {icon: markerRouteStyles[route.properties.profile]});
							                                            },
							                                            onEachFeature: onEachFeature,
                                                                        filter: function(feature, layer) {
                                                                            return feature.geometry.type === "Point";
                                                                        }
                });
                routeLayers[route.properties.profile].addTo(map);
	            routeLengths[route.properties.profile] = Math.round(route.properties.length);
      }
    }).done(function () {
        map.spin(false);
	    var totalTime = new Date().getTime()-ajaxTime;
	    $("#responseTime").html("Temps de réponse : " + totalTime+ " ms");
    }).error(function () {
        map.spin(false);
    });
}

// get all the routes
function computeAllRoutes() {
    if ((markersList.start.marker !== null) && (markersList.stop.marker !== null)) {
        computeRoute("length",markersList.start.marker.getLatLng().lat,markersList.start.marker.getLatLng().lng,markersList.stop.marker.getLatLng().lat,markersList.stop.marker.getLatLng().lng);
        computeRoute("cost_activity",markersList.start.marker.getLatLng().lat,markersList.start.marker.getLatLng().lng,markersList.stop.marker.getLatLng().lat,markersList.stop.marker.getLatLng().lng);
        computeRoute("cost_nature",markersList.start.marker.getLatLng().lat,markersList.start.marker.getLatLng().lng,markersList.stop.marker.getLatLng().lat,markersList.stop.marker.getLatLng().lng);
        computeRoute("cost_culture",markersList.start.marker.getLatLng().lat,markersList.start.marker.getLatLng().lng,markersList.stop.marker.getLatLng().lat,markersList.stop.marker.getLatLng().lng);
        document.getElementById("costType").style.display = "block";
        if (! firstRouteInfo) {
            document.getElementById("routeLength").style.display = "none";
            firstRouteInfo = true;
        }
	}
}

// get the circular route according to the profile passed as argument
function computeCircularRoute(profile,vlat1,vlon1,vlat2,vlon2,vlat3,vlon3,vlat4,vlon4) {
    map.spin(true,opts);
    var ajaxTime= new Date().getTime();
    $.ajax({
	    dataType: "json",
	    data: {
		    lat1: vlat1,
		    lon1: vlon1,
		    lat2: vlat2,
		    lon2: vlon2,
		    lat3: vlat3,
		    lon3: vlon3,
		    lat4: vlat4,
		    lon4: vlon4,
		    type: profile
	    },
	    url: '/circularroute.json',
	    success: function(route) {
		    console.log(route.properties.profile);
                if (routeLayers[route.properties.profile] !== undefined) {
                    map.removeLayer(routeLayers[route.properties.profile]);
                    map.removeLayer(markerRouteLayers[route.properties.profile]);
                }
                routeLayers[route.properties.profile] = L.geoJson(route,
                                                                  {style: routeStyles[route.properties.profile],
                                                                  filter: function(feature, layer) {
                                                                          return (feature.geometry.type === "LineString")||(feature.geometry.type === "MultiLineString");
                                                                          }
                });
                markerRouteLayers[route.properties.profile] = L.geoJson(route, {
                                                                        pointToLayer: function (feature, latlng) {
								                                            return L.marker(latlng, {icon: markerRouteStyles[route.properties.profile]});
							                                            },
							                                            onEachFeature: onEachFeature,
                                                                        filter: function(feature, layer) {
                                                                            return feature.geometry.type === "Point";
                                                                        }
                });
                routeLayers[route.properties.profile].addTo(map);
                markerRouteLayers[route.properties.profile].addTo(map);
	            routeLengths[route.properties.profile] = Math.round(route.properties.length);
      }
    }).done(function () {
        map.spin(false);
	    var totalTime = new Date().getTime()-ajaxTime;
	    $("#responseTime").html("Temps de réponse : " + totalTime+ " ms");
    }).error(function () {
        map.spin(false);
    });
}

// Reverse geocoding
function reverseGeocode(data) {
    var address = "";
    if (data.address.house_number !== undefined) {
        address = address + data.address.house_number + " ";
        }
    if (data.address.road !== undefined) {
        address = address + data.address.road+ ", ";
        }
    if (data.address.city !== undefined) {
        address = address + data.address.city;
        }
    return address;
}

// Set start and stop markers
function setMarker(marker,latlng) {
    if (markersList[marker].marker === null) {
        markersList[marker].marker = L.marker(latlng, {draggable:true, icon:markersList[marker].markerIcon});
        markersList[marker].marker.addTo(map);
        (markersList[marker].marker).on('dragend', function(event) {
            var markerEvent = event.target;
            setMarker(marker,markerEvent.getLatLng());
            if (marker==="start") {
                $.getJSON("http://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=" + markerEvent.getLatLng().lat + "&lon=" + markerEvent.getLatLng().lng, function(data) {
                    var address = reverseGeocode(data);
                    document.getElementById("startField").value = address;
                }); 
                }
            if (marker==="stop") {
                $.getJSON("http://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=" + markerEvent.getLatLng().lat + "&lon=" + markerEvent.getLatLng().lng, function(data) {
                    var address = reverseGeocode(data);
                    document.getElementById("destinationField").value = address;
                }); 
                }
            computeAllRoutes();
        });
    } else {
        markersList[marker].marker.setLatLng(latlng);
    }
}

// set the markers for circular routing
function setCircularMarkers(latlng) {
    // Variables and parameters
    var circularLength = circularTime * walkingSpeed;
    var direction = Math.random()*360;
    var distanceOpposite = circularLength/Math.PI; // geographic distance to the point opposite to the starting point
    var degreeKmEquator = 111.2; // Multiply by cos(lat) for the value at the current lat
    var degreeKm = degreeKmEquator * Math.cos(latlng.lat);
    // set c_start, the start and end point of the circular route
    if (markersList.c_start.marker === null) {
        markersList.c_start.marker = L.marker(latlng, {icon:markersList.c_start.markerIcon});
        markersList.c_start.marker.addTo(map);
        (markersList.c_start.marker).on('dragend', function(event) {
            var markerEvent = event.target;
            setMarker("c_start",markerEvent.getLatLng());
            //Compute circular route
        });
    } else {
        markersList.c_start.marker.setLatLng(latlng);
    }
    var c_startLat = markersList.c_start.marker.getLatLng().lat;
    var c_startLon = markersList.c_start.marker.getLatLng().lng;
    
    // set the intermediate point:c_step2
    var c_step2Lat = markersList.c_start.marker.getLatLng().lat+distanceOpposite*Math.sin(direction)/degreeKm;
    var c_step2Lon = markersList.c_start.marker.getLatLng().lng+distanceOpposite*Math.cos(direction)/degreeKm;
    
    // set the intermediate point:c_step1
    var c_step1Lat = markersList.c_start.marker.getLatLng().lat+(distanceOpposite/Math.sqrt(2))*Math.sin(direction-Math.PI/4)/degreeKm;
    var c_step1Lon = markersList.c_start.marker.getLatLng().lng+(distanceOpposite/Math.sqrt(2))*Math.cos(direction-Math.PI/4)/degreeKm;
    
    // set the intermediate point:c_step3
    var c_step3Lat = markersList.c_start.marker.getLatLng().lat+(distanceOpposite/Math.sqrt(2))*Math.sin(direction+Math.PI/4)/degreeKm;
    var c_step3Lon = markersList.c_start.marker.getLatLng().lng+(distanceOpposite/Math.sqrt(2))*Math.cos(direction+Math.PI/4)/degreeKm;
    
    // Compute the circular route
    map.removeLayer(routeLayers.length);
    map.removeLayer(routeLayers.cost_activity);
    map.removeLayer(routeLayers.cost_nature);
    map.removeLayer(routeLayers.cost_culture);
    map.removeLayer(markerRouteLayers.length);
    map.removeLayer(markerRouteLayers.cost_activity);
    map.removeLayer(markerRouteLayers.cost_nature);
    map.removeLayer(markerRouteLayers.cost_culture);
    computeCircularRoute(circularProfile,c_startLat,c_startLon,c_step1Lat,c_step1Lon,c_step2Lat,c_step2Lon,c_step3Lat,c_step3Lon);
}

function removeMarkerIfExists(marker) {
    if(markersList[marker].marker !== null) {
        map.removeLayer(markersList[marker].marker);
        markersList[marker].marker = null;
    }
}

    
function chooseRoutingMode(profile) {
    console.log(profile);
    switch(profile) {
        case "shortestPath":
            document.getElementById("startAddress").style.display = "block";
            if(document.getElementById("destinationAddress").style.display !== "block") {
                document.getElementById("destinationAddress").style.display = "none";
            }
            document.getElementById("routeLength").style.display = "none";
            document.getElementById("startAddressCircular").style.display = "none";
            document.getElementById("circularLengthPrompt").style.display = "none";
            document.getElementById("costTypeCircular").style.display = "none";
            document.getElementById("costType").style.display = "none";
            removeMarkerIfExists("c_start");
            map.removeLayer(routeLayers.length);
            map.removeLayer(routeLayers.cost_activity);
            map.removeLayer(routeLayers.cost_nature);
            map.removeLayer(routeLayers.cost_culture);
            map.removeLayer(markerRouteLayers.length);
            map.removeLayer(markerRouteLayers.cost_activity);
            map.removeLayer(markerRouteLayers.cost_nature);
            map.removeLayer(markerRouteLayers.cost_culture);
            $("#btnShortestPath").button('toggle');
        break;
        case "circular":
            document.getElementById("startAddressCircular").style.display = "block";
            document.getElementById("startAddress").style.display = "none";
            document.getElementById("destinationAddress").style.display = "none";
            document.getElementById("costType").style.display = "none";
            document.getElementById("routeLength").style.display = "none";
            removeMarkerIfExists("start");
            removeMarkerIfExists("stop");
            map.removeLayer(routeLayers.length);
            map.removeLayer(routeLayers.cost_activity);
            map.removeLayer(routeLayers.cost_nature);
            map.removeLayer(routeLayers.cost_culture);
            map.removeLayer(markerRouteLayers.length);
            map.removeLayer(markerRouteLayers.cost_activity);
            map.removeLayer(markerRouteLayers.cost_nature);
            map.removeLayer(markerRouteLayers.cost_culture);
            document.getElementById("btnCircular").checked = true;
            $("#btnCircular").button('toggle');
        break;
    }
}

// Create the context menu in order to set the start and stop points
map.on('contextmenu', function(e) {
	$.contextMenu({
        selector: '#map',
        callback: function(key, options) {
            if (key==="start") {
                    chooseRoutingMode('shortestPath');
                    document.getElementById("startAddress").style.display = "block";
                    $.getJSON("http://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=" + e.latlng.lat + "&lon=" + e.latlng.lng, function(data) {
                        var address = reverseGeocode(data);
                        document.getElementById("startField").value = address;
                    });
		            setMarker(key,e.latlng);
	                computeAllRoutes();
                    $.contextMenu('destroy', '#map');
            }                    
            if (key==="stop") {
                    chooseRoutingMode('shortestPath');
		            setMarker(key,e.latlng);
                    document.getElementById("destinationAddress").style.display = "block";
                    $.getJSON("http://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=" + e.latlng.lat + "&lon=" + e.latlng.lng, function(data) {
                        var address = reverseGeocode(data);
                        document.getElementById("destinationField").value = address;
                    }); 
	                computeAllRoutes();
                    $.contextMenu('destroy', '#map');
            }
            if (key==="c_start") {
                    $.getJSON("http://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=" + e.latlng.lat + "&lon=" + e.latlng.lng, function(data) {
                        var address = reverseGeocode(data);
                        document.getElementById("startFieldCircular").value = address;
                    }); 
		            chooseRoutingMode('circular');
                    document.getElementById("costTypeCircular").style.display = "block";
                    document.getElementById("circularLengthPrompt").style.display = "block";
		            setCircularMarkers(e.latlng);
                    $.contextMenu('destroy', '#map');
            }
        },
        items: {
            "start": {
                name: "Start"
            },
            "stop": {
                name: "Destination"
	        },
	        "sep1": "---------",
            "c_start": {
                name: "Circular route from here"
	        }

        }
    });
});

function circularLengthSet() {
    circularTime = $('#circularLengthField').val()/60; //Convert minutes to hours
    setCircularMarkers(markersList.c_start.marker.getLatLng());
}


function timeFormating(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds - (hours * 3600)) / 60);
    
    if (hours>0) {hours = hours +' h ';} else {hours = '';}
    return (hours + minutes + ' min');
}

function lengthFormating(meters) {
    var km = Math.floor(meters / 1000);
    var m = Math.floor((meters - (km * 1000))/10)*10;
    
    if (km>0) {km = km +' km ';} else {km = '';}
    return (km + m + ' m');
}

// Informations about the chosen route
function infoRoute(profile) {
    if (firstRouteInfo) {
        document.getElementById("routeLength").style.display = "block";
        firstRouteInfo = false;
    }
	$("#routeLengthContent").html("Length: " + lengthFormating(routeLengths[profile]) + " <br> Duration: " + timeFormating(routeLengths[profile]*3.6/walkingSpeed));
}

// keep only one route
function chooseRoute(profile) {
    switch(profile) {
        case "length":
            routeLayers.length.addTo(map);
            markerRouteLayers.length.addTo(map);
            map.removeLayer(routeLayers.cost_activity);
            map.removeLayer(routeLayers.cost_nature);
            map.removeLayer(routeLayers.cost_culture);
            map.removeLayer(markerRouteLayers.cost_activity);
            map.removeLayer(markerRouteLayers.cost_nature);
            map.removeLayer(markerRouteLayers.cost_culture);
            
        break;
        case "cost_activity":
            routeLayers.cost_activity.addTo(map);
            markerRouteLayers.cost_activity.addTo(map);
            map.removeLayer(routeLayers.length);
            map.removeLayer(routeLayers.cost_nature);
            map.removeLayer(routeLayers.cost_culture);
            map.removeLayer(markerRouteLayers.length);
            map.removeLayer(markerRouteLayers.cost_nature);
            map.removeLayer(markerRouteLayers.cost_culture);
        break;
        case "cost_nature":
            routeLayers.cost_nature.addTo(map);
            markerRouteLayers.cost_nature.addTo(map);
            map.removeLayer(routeLayers.cost_activity);
            map.removeLayer(routeLayers.length);
            map.removeLayer(routeLayers.cost_culture);
            map.removeLayer(markerRouteLayers.cost_activity);
            map.removeLayer(markerRouteLayers.length);
            map.removeLayer(markerRouteLayers.cost_culture);
        break;
        case "cost_culture":
            routeLayers.cost_culture.addTo(map);
            markerRouteLayers.cost_culture.addTo(map);
            map.removeLayer(routeLayers.cost_activity);
            map.removeLayer(routeLayers.length);
            map.removeLayer(routeLayers.cost_nature);
            map.removeLayer(markerRouteLayers.cost_activity);
            map.removeLayer(markerRouteLayers.length);
            map.removeLayer(markerRouteLayers.cost_nature);
        break;
    }
    infoRoute(profile);
}

function setStart() {
     $.getJSON("http://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + document.getElementById('startField').value, function(data) {
        $.each(data, function(key, val) {
            setMarker("start",new L.LatLng(val.lat, val.lon));
            document.getElementById("destinationAddress").style.display = "block";
	        computeAllRoutes();
        });
    }); 
}

function setStartCircular() {
    $.getJSON("http://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + document.getElementById('startFieldCircular').value, function(data) {
        $.each(data, function(key, val) {
            setMarker("c_start",new L.LatLng(val.lat, val.lon));
            document.getElementById("circularLengthPrompt").style.display = "block";
            document.getElementById("costTypeCircular").style.display = "block";
            setCircularMarkers(markersList.c_start.marker.getLatLng());
        });
    });	
}

function setDestination() {
    $.getJSON("http://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + document.getElementById('destinationField').value, function(data) {
        $.each(data, function(key, val) {
            setMarker("stop",new L.LatLng(val.lat, val.lon));
	        computeAllRoutes();
        });
    }); 
}
var target = document.getElementById('map');


// Contents
var t_lang = '<select id="languageSelector">'
           + '    <option value="i18nTableEn" selected="1">English</option>'
           + '    <option value="i18nTableFr">Français</option>'
           + '</select>';
                  
var t_routingMode = '<div class="btn-group" data-toggle="buttons-radio" data-step="1" data-position="right" data-intro="first">'
                  + '   <button type="button" id="btnShortestPath" class="btn"><i class="icon-share-alt"></i>{{itinerary}}</button>'
                  + '   <button type="button" id="btnCircular" class="btn"><i class="icon-repeat"></i>{{loop}}</button>'
                  + '</div>';
                 
                 
var t_startAddress = '<input type="text" class="actionDiv" id="startField" placeholder="{{start}}" rel="popover" data-content="{{startContent}}">'
                   + '<button type="button" class="btn" id="btnStartAddress"><i class="icon-search"></i></button>';
                  
var t_startAddressCircular = '<input type="text" class="actionDiv" id="startFieldCircular" placeholder="{{startCircular}}" rel="popover" data-content="{{startCircularContent}}">'
                           + '<button type="button" class="btn" id="btnStartAddressCircular"><i class="icon-search"></i></button>';            
        
var t_destinationAddress = '<input type="text" class="actionDiv" id="destinationField" placeholder="{{destination}}" rel="popover" data-content="{{destinationContent}}">'
                         + '<button type="button" class="btn" id="btnDestinationAddress"><i class="icon-search"></i></button>';
        
var t_routeLength = '<ul class="nav nav-list">'
                  + '   <li class="divider"></li>'
                  + '</ul>'
                  + '<div id="routeLengthContent">'
                  + '</div>';
        
var t_costType = '<div class="btn-group" data-toggle="buttons-radio" id="btnGroupCostType">'
               + '  <button type="button" id="btnLength" class="btn btn-large btn-danger" rel="tooltip" data-title="{{shortest}}"><i class="icon-arrow-right"></i></button>'
               + '  <button type="button" id="btnActivity" class="btn btn-large btn-primary" rel="tooltip" data-title="{{activity}}"><i class="icon-shopping-cart"></i></button>'
               + '  <button type="button" id="btnNature" class="btn btn-large btn-success" rel="tooltip" data-title="{{nature}}"><i class="icon-leaf"></i></button>'
               + '  <button type="button" id="btnCulture" class="btn btn-large btn-warning" rel="tooltip" data-title="{{culture}}"><i class="icon-book"></i></button>'
               + '</div>';
               
               
var t_costTypeCircular = '<div class="btn-group" data-toggle="buttons-radio" id="btnGroupCostTypeCircular">'
                       + '  <button type="button" id="btnLengthC" class="btn btn-large btn-danger" rel="tooltip" data-title="{{shortest}}"><i class="icon-arrow-right"></i></button>'
                       + '  <button type="button" id="btnActivityC" class="btn btn-large btn-primary" rel="tooltip" data-title="{{activity}}"><i class="icon-shopping-cart"></i></button>'
                       + '  <button type="button" id="btnNatureC" class="btn btn-large btn-success" rel="tooltip" data-title="{{nature}}"><i class="icon-leaf"></i></button>'
                       + '  <button type="button" id="btnCultureC" class="btn btn-large btn-warning" rel="tooltip" data-title="{{culture}}"><i class="icon-book"></i></button>'
                       + '</div>';
    

var t_circularLengthPrompt = '<form class="form-inline">'
                           + '  <fieldset>'
                           + '      <div class="input-append">'
                           + '          <input type="number" class="span9" min="0" step="10" max="1000" id="circularLengthField" value="60">'
                           + '          <span class="add-on">min</span>'
                           + '      </div>'
                           + '      <button type="button" class="btn" id="btnCircularLengthSet">{{compute}}</button>'
                           + '  </fieldset>'
                           + '</form>';      

// Rendering
var lang = i18nTableEn;

var o_lang = Mustache.render(t_lang, lang);
var o_routingMode = Mustache.render(t_routingMode, lang);
var o_startAddress = Mustache.render(t_startAddress, lang);
var o_startAddressCircular = Mustache.render(t_startAddressCircular, lang);
var o_destinationAddress = Mustache.render(t_destinationAddress, lang);
var o_routeLength = Mustache.render(t_routeLength, lang);
var o_costType = Mustache.render(t_costType, lang);
var o_costTypeCircular = Mustache.render(t_costTypeCircular, lang);
var o_circularLengthPrompt = Mustache.render(t_circularLengthPrompt, lang);

$('#lang').html( o_lang );
$('#routingMode').html( o_routingMode );
$('#startAddress').html( o_startAddress );
$('#startAddressCircular').html( o_startAddressCircular );
$('#destinationAddress').html( o_destinationAddress );
$('#routeLength').html( o_routeLength );
$('#costType').html( o_costType );
$('#costTypeCircular').html( o_costTypeCircular );
$('#circularLengthPrompt').html( o_circularLengthPrompt );


// Jquery selectors
$("[rel='tooltip']").tooltip();
$("[rel='popover']").popover({placement:'bottom',html:true});

$("#languageSelector").on("change",function() {
    lang = window[$("#languageSelector").val()];
    console.log(lang);
    var o_routingMode = Mustache.render(t_routingMode, lang);
    var o_startAddress = Mustache.render(t_startAddress, lang);
    var o_startAddressCircular = Mustache.render(t_startAddressCircular, lang);
    var o_destinationAddress = Mustache.render(t_destinationAddress, lang);
    var o_routeLength = Mustache.render(t_routeLength, lang);
    var o_costType = Mustache.render(t_costType, lang);
    var o_costTypeCircular = Mustache.render(t_costTypeCircular, lang);
    var o_circularLengthPrompt = Mustache.render(t_circularLengthPrompt, lang);

    $('#routingMode').html( o_routingMode );
    $('#startAddress').html( o_startAddress );
    $('#startAddressCircular').html( o_startAddressCircular );
    $('#destinationAddress').html( o_destinationAddress );
    $('#routeLength').html( o_routeLength );
    $('#costType').html( o_costType );
    $('#costTypeCircular').html( o_costTypeCircular );
    $('#circularLengthPrompt').html( o_circularLengthPrompt );
});

$(document).ready(function() {
    introJs().start();
});

// Call Nominatim to set the start or end points when using the search bar
$("body").on("keyup", "#startField", function(e){
    if (e.keyCode === 13) {
        setStart();
    }
});
$("body").on("keyup", "#startFieldCircular", function(e){
    if (e.keyCode === 13) {
        setStartCircular();
    }
});
$("body").on("keyup", "#destinationField", function(e){
    if (e.keyCode === 13) {
        setDestination();
    }
});
$("body").on("keyup", "#circularLengthField", function(e){
    if (e.keyCode === 13) {
        circularLengthSet();
    }
});

// Buttons click

$("body").on("click", "#btnShortestPath", function(){
    chooseRoutingMode('shortestPath');
});
$("body").on("click", "#btnCircular", function(){
    chooseRoutingMode('circular');
});
$("body").on("click", "#btnStartAddress", function(){
    setStart();
});
$("body").on("click", "#btnStartAddressCircular", function(){
    setStartCircular();
});
$("body").on("click", "#btnDestinationAddress", function(){
    setDestination();
});
$("body").on("click", "#btnLength", function(){
    chooseRoute('length');
});
$("body").on("click", "#btnActivity", function(){
    chooseRoute('cost_activity');
});
$("body").on("click", "#btnNature", function(){
    chooseRoute('cost_nature');
});
$("body").on("click", "#btnCulture", function(){
    chooseRoute('cost_culture');
});
$("body").on("click", "#btnLengthC", function(){
    circularProfile='length';
});
$("body").on("click", "#btnActivityC", function(){
    circularProfile='cost_activity';
});
$("body").on("click", "#btnNatureC", function(){
    circularProfile='cost_nature';
});
$("body").on("click", "#btnCultureC", function(){
    circularProfile='cost_culture';
});
$("body").on("click", "#btnCircularLengthSet", function(){
    circularLengthSet();
});
