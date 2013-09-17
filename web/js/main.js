// Walking speed. In km/h
var walkingSpeed=5; 

// To be prompted. In hours
var circularTime=1;

// Set a default value
var circularProfile="length";

var map = new L.Map('map', {zoomControl:false});
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
map.setMaxBounds(new L.LatLngBounds(new L.LatLng(43.5,1.18),new L.LatLng(43.77,1.64)));

// Route styles for display
var routeStyles = {
    "length":  {
        "color": "#f70952",
        "weight": 5,
        "opacity": 0.5,
        "clickable": false
    },
    "cost_activity" : {
        "color": "#f3891e",
        "weight": 5,
        "opacity": 0.5,
        "clickable": false
    },
    "cost_nature": {
        "color": "#0bd05a",
        "weight": 5,
        "opacity": 0.5,
        "clickable": false
    },
    "cost_culture": {
        "color": "#7516ea",
        "weight": 5,
        "opacity": 0.5,
        "clickable": false
    }
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


var startIcon = L.icon({
    iconUrl: '/img/marker-start.png',
    shadowUrl: '/img/marker-shadow.png',
    iconSize: [35, 45], 
    iconAnchor:   [17, 42],
    popupAnchor: [1, -32],
    shadowAnchor: [10, 12],
    shadowSize: [36, 16]
});

var stopIcon = L.icon({
    iconUrl: '/img/marker-stop.png',
    shadowUrl: '/img/marker-shadow.png',
    iconSize: [35, 45], 
    iconAnchor:   [17, 42],
    popupAnchor: [1, -32],
    shadowAnchor: [10, 12],
    shadowSize: [36, 16]
});

var circularIcon = L.icon({
    iconUrl: '/img/marker-circular.png',
    shadowUrl: '/img/marker-shadow.png',
    iconSize: [35, 45], 
    iconAnchor:   [17, 42],
    popupAnchor: [1, -32],
    shadowAnchor: [10, 12],
    shadowSize: [36, 16]
});

var activityIcon = L.icon({
    iconUrl: '/img/marker-activity.png',
    shadowUrl: '/img/marker-shadow.png',
    iconSize: [35, 45], 
    iconAnchor:   [17, 42],
    popupAnchor: [1, -32],
    shadowAnchor: [10, 12],
    shadowSize: [36, 16]
});

var natureIcon = L.icon({
    iconUrl: '/img/marker-nature.png',
    shadowUrl: '/img/marker-shadow.png',
    iconSize: [35, 45], 
    iconAnchor:   [17, 42],
    popupAnchor: [1, -32],
    shadowAnchor: [10, 12],
    shadowSize: [36, 16]
});

var cultureIcon = L.icon({
    iconUrl: '/img/marker-culture.png',
    shadowUrl: '/img/marker-shadow.png',
    iconSize: [35, 45], 
    iconAnchor:   [17, 42],
    popupAnchor: [1, -32],
    shadowAnchor: [10, 12],
    shadowSize: [36, 16]
});

var markerRouteStyles = {
    "cost_activity" : activityIcon,
    "cost_nature": natureIcon,
    "cost_culture": cultureIcon
};

var markersList = {
    "start": {
        "marker": null,
        "markerIcon": startIcon
    },
    "stop": {
        "marker": null,
        "markerIcon": stopIcon
    },
    "c_start": {
        "marker": null,
        "markerIcon": circularIcon
    }
};

// Length of the routes
var routeLengths = {
    "length": null,
    "cost_activity": null,
    "cost_nature": null,
    "cost_culture": null
};

// Chosen profile
var profileChosen = null;

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


// Detect browser language
var language = window.navigator.userLanguage || window.navigator.language;
switch(language.substring(0,2)) {
    case "fr":
        var lang=i18nTableFr;
    break;
    default:
        var lang=i18nTableEn;
}

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
        document.getElementById("routeLengthCircular").style.display = "block";
        infoRouteCircular(circularProfile);
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
    var reduction = 0.8; // Street network is not an open space so the distances need to be reduced
    var circularLength = circularTime * walkingSpeed;
    var direction = Math.random() * 2 * Math.PI;
    var distanceOpposite = circularLength/Math.PI*reduction; // geographic distance to the point opposite to the starting point
    var degreeKmEquator = 111.2; // Multiply by cos(lat) for the value at the current lat
    var degreeKm = degreeKmEquator * Math.cos(latlng.lat * Math.PI /180);
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
            document.getElementById("routeLengthCircular").style.display = "none";
            document.getElementById("routeTypeCircular").style.display = "none";
            removeMarkerIfExists("c_start");
            map.removeLayer(routeLayers.length);
            map.removeLayer(routeLayers.cost_activity);
            map.removeLayer(routeLayers.cost_nature);
            map.removeLayer(routeLayers.cost_culture);
            map.removeLayer(markerRouteLayers.length);
            map.removeLayer(markerRouteLayers.cost_activity);
            map.removeLayer(markerRouteLayers.cost_nature);
            map.removeLayer(markerRouteLayers.cost_culture);
            $("#btnShortestPath").css("background-color", "#4b4a4a");
            $("#btnCircular").css("background-color", "#dadbdc");
        break;
        case "circular":
            document.getElementById("startAddressCircular").style.display = "block";
            document.getElementById("startAddress").style.display = "none";
            document.getElementById("destinationAddress").style.display = "none";
            document.getElementById("costType").style.display = "none";
            document.getElementById("routeLength").style.display = "none";
            document.getElementById("routeLengthCircular").style.display = "none";
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
            $("#btnCircular").css("background-color", "#4b4a4a");
            $("#btnShortestPath").css("background-color", "#dadbdc");
        break;
    }
}

// Create the context menu in order to set the start and stop points
map.on('contextmenu', function(e) {
	$.contextMenu({
        selector: '#map',
        callback: function(key, options) {
            console.log(key);
            if (key==="start") {
                chooseRoutingMode('shortestPath');
                setMarker(key,e.latlng);
                console.log("cm start");
                document.getElementById("startAddress").style.display = "block";
                $.getJSON("http://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=" + e.latlng.lat + "&lon=" + e.latlng.lng, function(data) {
                    var address = reverseGeocode(data);
                    document.getElementById("startField").value = address;
                });
                computeAllRoutes();
                document.getElementById("destinationAddress").style.display = "block";
                $.contextMenu('destroy', '#map');
            }                    
            if (key==="stop") {
                chooseRoutingMode('shortestPath');
	            setMarker(key,e.latlng);
                console.log("cm stop");
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
                chooseRouteCircular('length');
                console.log("cm circ start");
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
    return ((Math.round(meters/100))/10).toFixed(1);
}

// Informations about the chosen route
function infoRoute(profile) {
    if (firstRouteInfo) {
        document.getElementById("routeLength").style.display = "block";
        firstRouteInfo = false;
    }
    var t_routeLength = '<span style="font-size:25px;color:' + routeStyles[profile]["color"] + ';">{{' + profileChosen + '}}</span><br><br>'
                      + '<div id="routeLengthTime">'
                      + '   <span style="background:white;font-size:50px;padding-left:5px;padding-right:5px;color:' + routeStyles[profile]["color"] + ';">' + Math.round(routeLengths[profile]*3.6/60/walkingSpeed) + '</span> {{min}}<br>{{time}}'
                      + '</div>'
                      + '<div id="routeLengthDist">'
                      + '   <span style="background:white;font-size:50px;padding-left:5px;padding-right:5px;color:' + routeStyles[profile]["color"] + ';">' + lengthFormating(routeLengths[profile]) + '</span> {{km}}<br>{{distance}}'
                      + '</div>';
    var o_routeLength = Mustache.render(t_routeLength, lang);
    $('#routeLengthBlock').html( o_routeLength );
}

function chooseRouteCircular(profile) {
    circularProfile = profile;
    document.getElementById("routeTypeCircular").style.display = "block";
    var t_routeTypeCircular = '<span style="font-size:25px;color:' + routeStyles[profile]["color"] + ';">{{' + profile + '}}</span><br><br>';
    var o_routeTypeCircular = Mustache.render(t_routeTypeCircular, lang);
    $('#routeTypeCircular').html( o_routeTypeCircular );
}

function infoRouteCircular(profile) {
    var t_routeLengthCircular = '<div id="routeLengthTimeCircular">'
                              + '   <span style="background:white;font-size:50px;padding-left:5px;padding-right:5px;color:' + routeStyles[profile]["color"] + ';">' + Math.round(routeLengths[profile]*3.6/60/walkingSpeed) + '</span> {{min}}<br>{{time}}'
                              + '</div>'
                              + '<div id="routeLengthDistCircular">'
                              + '   <span style="background:white;font-size:50px;padding-left:5px;padding-right:5px;color:' + routeStyles[profile]["color"] + ';">' + lengthFormating(routeLengths[profile]) + '</span> {{km}}<br>{{distance}}'
                              + '</div>';
    var o_routeLengthCircular = Mustache.render(t_routeLengthCircular, lang);
    $('#routeLengthCircular').html( o_routeLengthCircular );
}

// keep only one route
function chooseRoute(profile) {
    profileChosen=profile;
    switch(profile) {
        case "length":
            var o_costType = Mustache.render(t_costType, lang);
            $('#costType').html( o_costType );
            console.log(profileChosen);
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
     $.getJSON("http://nominatim.openstreetmap.org/search?format=json&limit=1&viewbox=1.18,43.77,1.64,43.5&bounded=1&q=" + document.getElementById('startField').value, function(data) {
        $.each(data, function(key, val) {
            document.getElementById("destinationAddress").style.display = "block";
            setMarker("start",new L.LatLng(val.lat, val.lon));
	        computeAllRoutes();
        });
    }); 
}

function setStartCircular() {
    $.getJSON("http://nominatim.openstreetmap.org/search?format=json&limit=1&viewbox=1.18,43.77,1.64,43.5&bounded=1&q=" + document.getElementById('startFieldCircular').value, function(data) {
        $.each(data, function(key, val) {
            document.getElementById("circularLengthPrompt").style.display = "block";
            document.getElementById("costTypeCircular").style.display = "block";
            setMarker("c_start",new L.LatLng(val.lat, val.lon));
            setCircularMarkers(markersList.c_start.marker.getLatLng());
        });
    });	
}

function setDestination() {
    $.getJSON("http://nominatim.openstreetmap.org/search?format=json&limit=1&viewbox=1.18,43.77,1.64,43.5&bounded=1&q=" + document.getElementById('destinationField').value, function(data) {
        $.each(data, function(key, val) {
            setMarker("stop",new L.LatLng(val.lat, val.lon));
	        computeAllRoutes();
        });
    }); 
}
var target = document.getElementById('map');


// Contents

var t_introText = '<div id="logo" data-step="1" data-position="right" data-intro="{{tour_step1}}">'
                + '    <div id="logo-img"><img src="/img/logo-moodwalkr.png"> Beta</div>'
                + '</div>'
                + '<div id="introText" data-step="11" data-position="right" data-intro="{{tour_step11}}">'
                + '    <span style="font-size:16px;vertical-align:middle;">{{introduction}}</font>'
                + '</div>';

var t_routingMode = '<a href="#" class="button" id="btnShortestPath" data-step="2" data-position="right" data-intro="{{tour_step2}}">'
                  + '    <span class="itinerary"></span><span class="btn-text">{{itinerary}}</span>'
                  + '</a>'
                  + '<a href="#" class="button" id="btnCircular" data-step="7" data-position="right" data-intro="{{tour_step7}}">'
                  + '    <span class="loop"></span><span class="btn-text">{{loop}}</span>'
                  + '</a>';                 
                 
var t_startAddress = '<div id="startAddressBlock" data-step="3" data-position="right" data-intro="{{tour_step3}}">'
                   + '  <input type="text" class="text-field" id="startField" placeholder="{{start}}" rel="popover" data-content="{{startContent}}">'
                   + '  <span id="btnStartAddress"></span>'
                   + '</div>';            
                 
var t_startAddressCircular = '<div id="startCircularAddressBlock" data-step="8" data-position="right" data-intro="{{tour_step8}}">'
                           + '  <input type="text" class="text-field" id="startFieldCircular" placeholder="{{startCircular}}" rel="popover" data-content="{{startCircularContent}}">'
                           + '  <span id="btnStartAddressCircular"></span>'
                           + '</div>';           
        
var t_destinationAddress = '<div id="destinationAddressBlock" data-step="4" data-position="right" data-intro="{{tour_step4}}">'
                         + '  <input type="text" class="text-field" id="destinationField" placeholder="{{destination}}" rel="popover" data-content="{{destinationContent}}">'
                         + '  <span id="btnDestinationAddress"></span>'
                         + '</div>';     

var t_routeLengthBlock = '<div id="routeLengthBlock" data-step="6" data-position="right" data-intro="{{tour_step6}}">'
                       + '</div>';          

var t_costType = '<ul class="iconsCt" id="iconsCTBlock" data-step="5" data-position="right" data-intro="{{tour_step5}}">'
               + '  <li id="btnLength">'
               + '      <a rel="tooltip" data-toggle="tooltip" title="{{length}}">'
               + '          <i class="icon-shortest"></i>'
               + '      </a>'
               + '  </li>'
               + '  <li id="btnActivity">'
               + '      <a rel="tooltip" data-toggle="tooltip" title="{{cost_activity}}">'
               + '          <i class="icon-activity"></i>'
               + '      </a>'
               + '  </li>'
               + '  <li id="btnNature">'
               + '      <a rel="tooltip" data-toggle="tooltip" title="{{cost_nature}}">'
               + '          <i class="icon-nature"></i>'
               + '      </a>'
               + '  </li>'
               + '  <li id="btnCulture">'
               + '      <a rel="tooltip" data-toggle="tooltip" title="{{cost_culture}}">'
               + '          <i class="icon-culture"></i>'
               + '      </a>'
               + '  </li>'
               + '</ul>';
               

var t_costTypeCircular = '<ul class="iconsCt" id="iconsCTCircularBlock" data-step="9" data-position="right" data-intro="{{tour_step9}}">'
                       + '  <li id="btnLengthC">'
                       + '      <a rel="tooltip" data-toggle="tooltip" title="{{length}}">'
                       + '          <i class="icon-shortest"></i>'
                       + '      </a>'
                       + '  </li>'
                       + '  <li id="btnActivityC">'
                       + '      <a rel="tooltip" data-toggle="tooltip" title="{{cost_activity}}">'
                       + '          <i class="icon-activity"></i>'
                       + '      </a>'
                       + '  </li>'
                       + '  <li id="btnNatureC">'
                       + '      <a rel="tooltip" data-toggle="tooltip" title="{{cost_nature}}">'
                       + '          <i class="icon-nature"></i>'
                       + '      </a>'
                       + '  </li>'
                       + '  <li id="btnCultureC">'
                       + '      <a rel="tooltip" data-toggle="tooltip" title="{{cost_culture}}">'
                       + '          <i class="icon-culture"></i>'
                       + '      </a>'
                       + '  </li>'
                       + '</ul>';
    

var t_circularLengthPrompt = '<form class="form-inline" id="step10"  data-step="10" data-position="right" data-intro="{{tour_step10}}">'
                           + '  <fieldset>'
                           + '      <input type="number" class="text-field" min="0" step="10" max="1000" id="circularLengthField" value="60">'
                           + '      <span class="add-on">min</span>'
                           + '      <a href="#" id="btnCircularLengthSet">'
                           + '          <span class="btn-text">{{compute}}</span>'
                           + '      </a>';
                           + '  </fieldset>'
                           + '</form>';      

// Rendering


var o_introText = Mustache.render(t_introText, lang);
var o_routingMode = Mustache.render(t_routingMode, lang);
var o_startAddress = Mustache.render(t_startAddress, lang);
var o_startAddressCircular = Mustache.render(t_startAddressCircular, lang);
var o_destinationAddress = Mustache.render(t_destinationAddress, lang);
var o_routeLengthBlock = Mustache.render(t_routeLengthBlock, lang);
var o_costType = Mustache.render(t_costType, lang);
var o_costTypeCircular = Mustache.render(t_costTypeCircular, lang);
var o_circularLengthPrompt = Mustache.render(t_circularLengthPrompt, lang);

$('#header').html( o_introText );
$('#routingMode').html( o_routingMode );
$('#startAddress').html( o_startAddress );
$('#startAddressCircular').html( o_startAddressCircular );
$('#destinationAddress').html( o_destinationAddress );
$('#routeLength').html( o_routeLengthBlock );
$('#costType').html( o_costType );
$('#costTypeCircular').html( o_costTypeCircular );
$('#circularLengthPrompt').html( o_circularLengthPrompt );


// Jquery selectors
$("[rel='tooltip']").tooltip({placement:'bottom'});
//$("[rel='popover']").popover({placement:'bottom',html:true});

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
    chooseRouteCircular('length');
    document.getElementById("routeLengthCircular").style.display = "none";
});
$("body").on("click", "#btnActivityC", function(){
    chooseRouteCircular('cost_activity');
    document.getElementById("routeLengthCircular").style.display = "none";
});
$("body").on("click", "#btnNatureC", function(){
    chooseRouteCircular('cost_nature');
    document.getElementById("routeLengthCircular").style.display = "none";
});
$("body").on("click", "#btnCultureC", function(){
    chooseRouteCircular('cost_culture');
    document.getElementById("routeLengthCircular").style.display = "none";
});
$("body").on("click", "#btnCircularLengthSet", function(){
    circularLengthSet();
});
$("body").on("click", "#help", function(){
    $.cookie('showIntro', 'true', {expire : 365});
    launchScenario();
    console.log("bbb");
});

$(document).ready(function() {
    $('a.fancybox').fancybox();
});
