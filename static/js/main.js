/*-------------------------------------------------------------------------------------------------------------------*/
/*  Global Data   */
/*-------------------------------------------------------------------------------------------------------------------*/

var init_done = false;
var data=[];
var zone_delta=(new Date()).getTimezoneOffset()*60000;	// time diff in ms
var time_offset = 0;
var limit=300; // 5mn 
var alert_on = false;
var resources = [];
var current_resource;
var current_data=0;
var current_canvas;
var max_visible_sensors=4;
var sensor_container_class = "s2x2" 
var thermostat = new Object();
var map;
var geolocalisation_enabled = false;
var	google_maps_loaded = false;

var periods = [ 
    {	name: "30 s",    value: 30 },
    {	name: "5 min",   value: 5*60 },
    {	name: "1 hour",  value: 60*60 },
    {	name: "1 day",   value: 24*60*60 },
    {	name: "1 week",  value: 7*24*60*60 },
    {	name: "1 month", value: 30*24*60*60 },
];

/*-------------------------------------------------------------------------------------------------------------------*/
/*  Utils  */
/*-------------------------------------------------------------------------------------------------------------------*/

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

/*-------------------------------------------------------------------------------------------------------------------*/
/*  Resources Management   */
/*-------------------------------------------------------------------------------------------------------------------*/

function mainControl(resource, active) {
	
	if ( active ) {
		with_default = true;
		if ( resource.type == "geolocalisation" || resource.type == "cloud" ) {
			with_default = false;
		}

		updateDisplay(resource, with_default)
	}
	else {
		updateDisplay()
	}
	if ( isResource(resource, "video", "webcam") && resource.peripheral_toogle ) {
		resource.peripheral_toogle.toggle(true);
	}
}

function peripheralControl(resource, active){

	if ( isResource(resource, "lighting", "livingroom" ) ) {
		if ( active ) {
				resource.peripheral_input.val(100).change();
				resource.peripheral_input.show();	
			}
			else {
				resource.peripheral_input.val(0).change();
				resource.peripheral_input.hide();
			}
	} 
	else if ( isResource(resource, "heater", "livingroom" ) ) {
		if ( resource.peripheral_input ) {
			if ( active ) {
				resource.peripheral_input.show();	
			}
			else {
				resource.peripheral_input.hide();
			}
		}
	}
	else if ( isResource(resource, "video", "webcam" ) ) {
		enable_webcam(resource, active);
		
	}
	else if ( isResource(resource, "door", "garage" ) ) {

		if ( !resource.door_garage_manual ) {
			resource.door_garage_manual = $(".toggle[name=door_garage_manual]");
			if ( resource.door_garage_manual ) {
				resource.door_garage_manual.on('toggle', function (e, m_active) {
					if ( resource.container ) {
						resource.container.attr("src", "/images/garage.jpg")
					}
					command(resource,{state:m_active?"open":"close"});
				});
				resource.door_garage_manual.toggles(false);
			}
		}
		if ( !resource.door_garage_auto ) {
			resource.door_garage_auto = $(".toggle[name=door_garage_auto]");
			if ( resource.door_garage_auto ) {
				resource.door_garage_auto.on('toggle', function (e, a_active) {
					if ( resource.container ) {
						resource.container.attr("src", a_active ? "/images/car_on.jpg" : "/images/car_off.jpg")
					}
					command(getResources("light","car"),{state:a_active?"on":"off"});
					
				});
				resource.door_garage_auto.toggles(false);
			}
		}
		if ( active ) {
			resource.door_garage_manual.hide();
			resource.door_garage_auto.toggles(true);
			resource.door_garage_auto.toggles(false);
			resource.door_garage_auto.show();
		}
		else {
			resource.door_garage_auto.hide();
			resource.door_garage_manual.toggles(true);
			resource.door_garage_manual.toggles(false);
			resource.door_garage_manual.show();
		}
	}
	
}

function peripheralInput(resource, onChange, value){

	if ( isResource(resource, "lighting", "livingroom" ) ) {
		command(resource, {brightness:value})
	}
	else if ( isResource(resource, "heater", "livingroom" ) ) {
		if ( resource.canvas ) {
			resource.canvas.setValue(value);
		}
	}
	else if ( isResource(resource, "video", "webcam" ) ) {
		command(getResources("servo", "webcam"), {angle:parseInt(value)})
	}
}

function getResources(type,name) {
	
	var rlist = [];
	for(i=0; i<resources.length; i++) {
		if ( resources[i].type == type ) {
			if (name) {
				if ( resources[i].name == name) {
					return resources[i];
				}
			}
			else {
				rlist.push(resources[i]);
			}
		}
	}
	if ( name ) {
		return null;
	}
	return rlist;	
}

function isResource(resource,type,name) {
	return (resource == getResources(type,name) )
}

function getLocalResource(resource){
	if ( resource ) {
		return getResources(resource.type, resource.name)
	}
	return null;
}

function initResourse(resource) {

	if ( !resource.init ) {

		resource.init = true;

		var width = 0;	
		var height = 0;
		var padding = 0;	

		var div   = $('#'+resource.type+'[name='+resource.name+']');
		
		if ( div.length ) {
			width = div.width();
			height = div.height() - $('#container_name').outerHeight(true);
			padding = $('#container_name').outerHeight(true);

			var ctl = $('#control[name="'+resource.type+'_'+resource.name+'"]')
			if ( ctl.length ) {
				height -= ctl.outerHeight(true);
				padding += ctl.outerHeight(true);
			}

			if ( resource.output &&  resource.output.type == "odometer" ) {
				height = 60;
			}

			var container   = $('#'+resource.type+"_"+resource.name);
			if ( container.length ) {
				resource.container = container;

				padding = (div.height() - height - padding)/2;
				if ( resource.type == "video" ) {

					container   = $('video#'+resource.type+"_"+resource.name);
					if ( container.length ) {
						container.height(height);
						container.width(width);
						container.css("padding-top", padding+"px");
					}

					container   = $('img#'+resource.type+"_"+resource.name);
					if ( container.length ) {
						container.height(height);
						container.width(width);
					}
					container.css("padding-top", padding+"px");
				}
				else if ( !container.hasClass('canvas') ) {
					container.height(height);
					container.width(width);
				}
				
				container.css("padding-top", padding+"px");
			}
		}
		
		if ( resource.container && resource.output ) {
			if ( !resource.output.hasOwnProperty('unit') )
			{
				resource.output.unit = "";
			}

			if ( resource.output.hasOwnProperty('min') &&  resource.output.hasOwnProperty('max') ) 
			{
				
				if ( !resource.output.threshold )
				{
					resource.output.threshold = resource.output.max;
				}
				resource.canvas = new steelseries.Radial( resource.canvas_name,
															{ 
																gaugeType: steelseries.GaugeType.TYPE4,
																minValue: resource.output.min,
																maxValue: resource.output.max,
																size: height,
																frameDesign: steelseries.FrameDesign.STEEL,
																knobStyle: steelseries.KnobStyle.STEEL,
																pointerType: steelseries.PointerType.TYPE6,
																section: null,
																area: null,
																titleString: resource.name,
																unitString: "("+resource.output.unit+")",
																threshold: resource.output.threshold,
																lcdVisible: true,
																lcdDecimals: 2,
																backgroundColor:steelseries.BackgroundColor.ANTHRACITE
															});
				
				resource.ledColor = steelseries.LedColor.GREEN_LED;

				$('input#'+resource.type +'[name="'+resource.name+'"]').val(resource.output.threshold).change();

				// thresholds
			    $('input#'+resource.type +'[name="'+resource.name+'"]').on('input', function (e) {
			    	var focus_sensor = getResources($(this).attr('id'),$(this).attr('name') )
			    	if ( focus_sensor &&  focus_sensor.canvas) {
				    	focus_sensor.canvas.setThreshold(e.target.value); 
				    	focus_sensor.threshold = e.target.value;
				    }
			    });

			}
			else if ( resource.output.type == "odometer" ) {
				resource.canvas = new steelseries.Odometer(resource.canvas_name, 
															{
															    height: height,
															    digits: 5
															});
			}

			resource.yaxisLabel = resource.name.capitalize()+" ("+resource.output.unit+")";
			resource.alert = false;
		}

		if ( resource.type == "sensor" ) {
			
			if ( !current_resource ) 
			{
				focus(resource);
			}
			$("#"+resource.type +'[name="'+resource.name+'"]').click(function() 
		    {
		  		focus(getResources($(this).attr('id'), $(this).attr('name')));
		    });
		}
		else if ( resource.type == "heater" ) {
			var valGrad = new steelseries.gradientWrapper(  10, 30,
		                                                [ 0, 0.33, 0.66, 0.85, 1],
		                                                [ new steelseries.rgbaColor(0, 0, 200, 1),
		                                                  new steelseries.rgbaColor(0, 200, 0, 1),
		                                                  new steelseries.rgbaColor(200, 200, 0, 1),
		                                                  new steelseries.rgbaColor(200, 0, 0, 1),
		                                                  new steelseries.rgbaColor(200, 0, 0, 1) ]
	                                            	);
	    	resource.canvas =  new steelseries.RadialBargraph(resource.canvas_name,
	    														{
										                            gaugeType: steelseries.GaugeType.TYPE4,
										                            size: height,
										                            minValue: 10,
																	maxValue: 30,
																	threshold: 10,
										                            valueGradient: valGrad,
										                            useValueGradient: true,
										                            titleString: 'Thermostat',
										                            unitString: 'C',
										                            lcdVisible: true,
										                            ledVisible:  false,
										                            backgroundColor: steelseries.BackgroundColor.BRUSHED_STAINLESS
									                        	}
												    		);
		}
		else if ( resource.type == "system") {
			resource.canvas_cpu = new steelseries.DisplaySingle('system_cpu', 
																{
												                    width: 65,
												                    height: 40,
												                    unitString: " % ",
												                    unitStringVisible: true,
												                    lcdDecimals: 0,
											                    });

			resource.canvas_ram = new steelseries.DisplaySingle('system_ram', 
																{
												                    width: 105,
												                    height: 40,
												                    unitString: " Mb ",
												                    unitStringVisible: true,
												                	lcdDecimals: 0,
											                    });
		}
		

		var peripheral_input = $('input[name="'+resource.type+'_'+resource.name+'"]');
		if ( peripheral_input.length) {

			resource.peripheral_input = peripheral_input;

			peripheral_input.on('input', function (e) 
			{
				peripheralInput(resource,false, e.target.value)
			});

			peripheral_input.on('change', function (e) 
			{
				peripheralInput(resource,true, e.target.value)
			});
		}

		var peripheral_toogle = $('.toggle[name="'+resource.type+'_'+resource.name+'"]');

		if ( peripheral_toogle.length ) {
			resource.peripheral_toogle = peripheral_toogle.data('toggles');
			peripheral_toogle.on('toggle', function (e, active) 
			{
				peripheralControl(resource, active);
			});
			resource.peripheral_toogle.toggle(false);
		}

		
	}
}

function addResource(resource, default_disp) {

	if (default_disp == null) {
		default_disp = false;
	}

	resource.default = default_disp;

	for(i=0; i<resources.length; i++) {
		if ( resources[i].type == resource.type && 
			 resources[i].name == resource.name ) {
			return;
		}
	}

	var klass = $('.'+resource.type);
	if ( klass.length ) {
		resource.class = klass;
	}

	resource.canvas_name = resource.type+"_"+resource.name;

	resources.push(resource);

	if ( resource.type == "sensor" ) {
		jcarouselUpdate(resource);
	}


	var control  = $('#control[name="'+resource.type+'"]');
	if ( control.length ) {
		control.show();
	}

	var main_toogle = $('.toggle[name="'+resource.type+'"]');

	if (main_toogle.length) {
		resource.main_toogle = main_toogle.data('toggles');
		main_toogle.on('toggle', function (e, active) 
		{
			mainControl(resource, active);
		});
	}
}

function resourceNewData(resource, val) {

	if ( isResource(resource,"sensor", "temperature") ) {

		var heater = getResources("heater", "livingroom");
		if ( heater ) {
			
			if ( heater.peripheral_toogle && heater.peripheral_toogle.active && heater.canvas ) {

				var threshold = heater.canvas.getValue();

				if ( val > threshold ) {
					if ( heater.on == null || heater.on == true ) {
						command(heater, {state:"off"})
					}
					heater.on = false;
				}
				else if ( val < threshold ) {
					if ( heater.on == null || heater.on == false ) {
						command(heater, {state:"on"})
					}
					heater.on = true;
				}
			}
		}
	}
	else if ( isResource(resource,"sensor", "light") || isResource(resource,"sensor", "proximity") ) {
		var garage = getResources("door", "garage");
		if ( garage ) {
			if ( garage.peripheral_toogle && garage.peripheral_toogle.active ) {	
				if ( ( isResource(resource,"sensor", "light") && val >= 1) ||
					 ( isResource(resource,"sensor", "proximity") && val < 15 ) ) {
				 	if ( garage.door_garage_manual ) {
						garage.door_garage_manual.toggles(true);
					}
				}
			}
		}
	}
}



/*-------------------------------------------------------------------------------------------------------------------*/
/*  Display   */
/*-------------------------------------------------------------------------------------------------------------------*/

function updateDisplay(resource, with_default) {
	if ( with_default == null ) {
		with_default = true;
	}

	change_focus = true;
		
	for(i=0; i<resources.length;i++) {
		var found = false;
		
		
		if ( resource ) {
			if ( resource.type == resources[i].type && resource.name == resources[i].name ) {
				found = true;
			}
		}
		
		if ( with_default && resources[i].default ) {
			found = true;
		}

		if ( found ) {
			
			if ( resources[i].class ) {
				resources[i].class.show();
			}
			
			if ( resources[i].main_toogle ) {
				resources[i].main_toogle.toggle(true, false, true)
			}

			initResourse(resources[i]);
		}
		else {

			if ( resources[i].class ) {
				resources[i].class.hide();
			}

			if ( resources[i].main_toogle ) {
				resources[i].main_toogle.toggle(false, false, true)
			}
		}
	}
}

function jcarouselUpdate(sensor) 
{
    var li;

    li = '<li>'
        li += '<div id="'+sensor.type + '" class="'+sensor_container_class +'" name="'+sensor.name+'">'
    		li += '<div id="container_name">'+sensor.name.capitalize()+'</div>'
    		li += '<canvas class="canvas" id="'+sensor.canvas_name+'"></canvas>'
    		li += '<div id="control" name="'+sensor.type+'_'+sensor.name+'">'
    			li += '<input id="'+sensor.type+'" name="'+sensor.name+'" type="range" min="'+sensor.output.min+'" max="'+sensor.output.max+'" step="1"  data-rangeslider class="threshold">'
    		li += '</div>'
        li += '</div>'
    li +=  '</li>';

    $('#jcarousel_sensors ul').append("'"+li+"'");

    $('#jcarousel_sensors').jcarousel('reload');
	$('.jcarousel-pagination').jcarouselPagination('reloadCarouselItems');
	var pagination_margin = $('.'+sensor_container_class).outerHeight(true)+15;
	$('.jcarousel-pagination a').css('margin-bottom', pagination_margin+"px");
   
}

function focus(resource) 
{
    if ( resource && (!current_resource  || current_resource != resource ) )
    {
		current_resource = resource;
		socket.emit('selectResource', current_resource);
		data =[];
		socket.emit("reqlimit", limit);
	}
}

function showCurrentLocation(latitude, longitude) 
{
	if (  google_maps_loaded ) 
	{
		var location = new google.maps.LatLng(latitude, longitude);

		if (!map) {
			map = new google.maps.Map(document.getElementById('map_canvas'), 
			{
			    center: location,
			    zoom: 10,
			    mapTypeId: google.maps.MapTypeId.ROADMAP,
			});
		}

		map.panTo(location);
		var marker = new google.maps.Marker(
			{
				position: location,
				map: map
			})
	}
}

function flot() 
{
    
	var len = data.length;

	window.requestAnimationFrame(flot);
 
	if( len < 1 ) 
	{ 
		return; 
	}

	var xmin = (new Date()).getTime()-limit*1000 -zone_delta;
	var xmax = (new Date()).getTime()-zone_delta;

	var d = [
		{ 
			data  : data, 
			color : '#45a31f',
			lines : 
			{
				show: true, 
			},

			points : 
			{
				show: limit==30 ? true : false,
				fill: true,
				fillColor: '#45a31f',
				radius: 4,
			},
		}
	];

	$.plot( $('#realtimeflot'), d, 
	{

		grid: 
		{
			show: true,
			borderWidth: { top: 0, right:0, left:0.2, bottom:0.2},
		},

		xaxis:  
		{
			min: xmin,
			max: xmax,
			mode:'time', 
			timeFormat:'%h:%M:%S',
			tickLength: 5,

		},

		yaxis:  
		{
			min: current_resource.min,
			max: current_resource.max,
			axisLabel: current_resource.yaxisLabel,
			axisLabelUseCanvas: true,
			axisLabelPadding: 10, 
			tickLength: 0,
		}
	});
}

/*-------------------------------------------------------------------------------------------------------------------*/
/*  Video   */
/*-------------------------------------------------------------------------------------------------------------------*/

var webcamvideoOn = false;
function enable_webcam(resource,enable) {
	console.log("WC "+JSON.stringify(resource))
	if (resource == getResources("video","webcam") ) {
		var img_div = $('img#'+resource.type+"_"+resource.name);
	    var video_div = $('video#'+resource.type+"_"+resource.name);

	    if (enable) {
	    	
	    	if ( img_div.length ) {
	    		img_div.hide();
	    	}
	    	
	    	if ( video_div.length && resource.input && resource.input.url ) {
		    	video_div.show();
		    	if ( webcamvideoOn == false ) {
		    		webcamvideoOn = true;
		    		video_div.attr("src", resource.input.url);
					var video = video_div.get(0);
					video.load();
					video.play();
		    	}
		    	
		    	if ( resource.input.targets ) {
		    		if ( !resource.target ) {
		    			resource.target = "default";
		    		}
		    		for(i=0; i<resource.input.targets.length; i++ ) {
		    			if ( resource.input.targets[i].target == resource.target ) {
		    				var val = resource.input.targets[i].angle;
		    				command(getResources("servo", "webcam"),  {angle:val})
		    			}
		    		}
		    	}
		    }
	    }
	    else {
	    	if ( video_div.length ) {
		    	video_div.hide();
		    }
	    	if ( img_div.length ) {
	    		img_div.show();
	    	}
	    }
	}
}


/*-------------------------------------------------------------------------------------------------------------------*/
/*  Init   */
/*-------------------------------------------------------------------------------------------------------------------*/
function initMap() 
{
	google_maps_loaded = true;
}


$(function() 
{
	$('input[type=range]').rangeslider( 
	{
			polyfill: true,
	});


	// history
	$ ('input[name=history]').on('change', function (e) 
	{
		if ( e.target.value >= 1 && e.target.value <= periods.length ) 
		{
			var period = periods[e.target.value-1];
			limit = period.value;
			data =[];
			socket.emit("reqlimit", limit);
			$('output#history').text(period.name);  
		}      
	});

	$('input[name=history]').on('input', function (e) 
	{
		if ( e.target.value >= 1 && e.target.value <= periods.length ) 
		{
			var period = periods[e.target.value-1];
			$('output#history').text(period.name);      
		}      
	});
/*
	// webcam
    $('input[name=webcam]').on('change', function (e) {
    	socket.emit("webcamTurn", e.target.value);   
    });

	// lighting
	$('input[name=lighting_ctl]').on('change', function (e) 
	{
		socket.emit("setBrightness", e.target.value);   
	});

	// thermostat
	$('input[name=thermostat]').on('input', function (e) 
	{
		if ( thermostat.canvas ) {
			thermostat.canvas.setValue(e.target.value);
		}	 
	});
	$('input[name=thermostat]').on('change', function (e) 
	{
		if ( thermostat.canvas ) {
			thermostat.canvas.setValue(e.target.value);
		}	 
	});*/

});

/* control commands */
$(function() 
{
	$('.toggle').toggles( {
							'on' : true
						});

	$('.toggle[name="door_garage"]').toggles({ 
												'on' : true,
												'text' : {
													'on' : "Auto",
													'off': "Manual"
												}
											})

	$('.toggle[name="door_garage_manual"]').toggles({
													'on' : true,
													'text' : {
														'on' : "Opened",
														'off': "Closed"
													}
												})


	$('.toggle[name=autoscroll]').on('toggle', function (e, active) 
	{
		if (active) 
		{
			$('.jcarousel').jcarouselAutoscroll('start');
		} 
		else 
		{
			$('.jcarousel').jcarouselAutoscroll('stop');
		}
	});
	
});

/* color picker */
$(function() {
	var colorPicker = $.farbtastic(".color_picker");

	colorPicker.linkTo(pickerUpdate);

	function pickerUpdate(color) {
		
		var r = parseInt(color.substring(1,3),16);
		var g = parseInt(color.substring(3,5),16);
		var b = parseInt(color.substring(5,7),16);
		
		command(getResources("lighting", "livingroom"), {color:{r:r,g:g,b:b}})
	}

});

/* sensor carousel */

$(function()  
{

	var jcarousel = $('.jcarousel');

        jcarousel
            .on('jcarousel:reload jcarousel:create', function () 
            {
                var carousel = $(this);
                
    			width = $('.'+sensor_container_class).outerWidth(true);

               	carousel.jcarousel('items').css('width',  width+'px');
               	
               	var sensors = getResources("sensor");
               	if ( sensors.length <= max_visible_sensors ) {
               		$('.jcarousel-wrapper').width(sensors.length*width); 
               	}

            })

            .jcarousel(
            {
                wrap: 'circular'
            })
			.jcarouselAutoscroll(
			{
	            interval: 3000,
	            target: '+=1',
	            autostart: true
        	})

			.on('jcarousel:targetin', 'li', function(event, carousel) 
			{
				var type = $(this).find('div').attr('id');
				var name = $(this).find('div').attr('name');
				focus(getResources(type,name))
			});

    $('.jcarousel-control-prev')
        .jcarouselControl(
        {
            target: '-=1'
        });

    $('.jcarousel-control-next')
        .jcarouselControl(
        {
            target: '+=1'
        });

    $('.jcarousel-pagination')
        .on('jcarouselpagination:active', 'a', function() 
        {
            $(this).addClass('active');
        })
        .on('jcarouselpagination:inactive', 'a', function() 
        {
            $(this).removeClass('active');
        })
        .on('click', function(e) 
        {
            e.preventDefault();
        })
        .jcarouselPagination(
        {
            perPage: 1,
            item: function(page) 
            {
                return '<a href="#' + page + '">' + page + '</a>';
            }
        });
});

/*-------------------------------------------------------------------------------------------------------------------*/
/*  From Client   */
/*-------------------------------------------------------------------------------------------------------------------*/
var socket=io.connect();

socket.on('init', function(v) 
{
	if ( init_done == false ) {
		$('.toggle[name=autoscroll]').toggles(false);
		$('.toggle[name=autoscroll]').toggles(true);

		$("#realtimeflot").height($('#history').height() - $('#control[name=history]').outerHeight(true)  - $("#container_name").outerHeight(true));

		$("#main").width($(".peripheral").outerWidth(true) + $("#history").outerWidth(true) + $("#controls").outerWidth(true)  );
		$(".jcarousel-wrapper").height($('.'+sensor_container_class).outerWidth(true));
		$("#main").height($("#controls").outerWidth(true) + $(".jcarousel-wrapper").outerHeight(true));

		$('.autoplug').hide();

		limit = v.limit;

		time_offset = ((new Date()).getTime() -v.time);

		for(i=0;i<periods.length; i++) 
		{
			if ( limit == periods[i].value ) 
			{
				$('input[name=history]').val(i+1).change();
			}
		}

		data = [];

		flot();

		init_done = true;
	}
});


socket.on('history', function(resource, a, clear) 
{
	resource = getLocalResource(resource);
	if ( resource ) {
		if ( clear == true) 
		{
			data = [];
		}

		if ( current_resource && current_resource == resource ) 
		{
			for (i=0; i<a.length; i++) 
			{
				var v = a[i];
				var ts = v[0]-zone_delta+time_offset ;

				data.push([ts, v[1]]);
			}
		}   
	}
});

socket.on('log',function(log)
{
console.log("LOG :"+log)
})

socket.on('data', function(resource, new_data) 
{
	console.log("New Data "+resource.type +"."+resource.name);
	resource = getLocalResource(resource);
	if ( resource && new_data.length > 0 ) 
	{
		var v = new_data[0];
		var ts = v[0]-zone_delta + time_offset;
		console.log(resource.name + " : "+v[1]);
		if ( current_resource && current_resource == resource ) 
		{
			data.push([ts+time_offset, v[1]]);
		}
		if ( resource.canvas  ) 
		{
			var val = v[1];
			if ( resource.sum ) {
				resource.sum += val;
				val = resource.sum;
			}

			resource.canvas.setValue(val);

			resourceNewData(resource, val)

			var ledColor = resource.ledColor;
			if ( ledColor != null && resource.output.hasOwnProperty('min') && resource.output.hasOwnProperty('max')) 
			{
				if ( v[1] < resource.output.min || v[1] > resource.output.max ) 
				{
					ledColor  = steelseries.LedColor.RED_LED;
				}
				else 
				{
					ledColor = steelseries.LedColor.GREEN_LED;
				}

				if ( ledColor != resource.ledColor ) 
				{
					resource.ledColor = ledColor;
				//	resource.canvas.setLedColor(sensor.ledColor);
				}
			}

			if ( v[1] >= resource.threshold ) 
			{
				resource.alert = true;
			} 
			else 
			{
				resource.alert = false;
			}
		}
		else
		{
			return;
		}

		// alerts
		var new_alert = false;
		for(i=0; i<resources.length; i++) 
		{
			if ( resources[i].alert == true ) 
			{
				new_alert = true;
				break;
			}
		}

		if ( alert_on != new_alert  ) 
		{
			alert_on = new_alert ;
			if ( alert_on == true ) 
			{
				command(getResources("alarm", "main"), {state:"on"})
			}
			else 
			{
				command(getResources("alarm", "main"), {state:"off"})
			}
		}
	}
});



socket.on('add', function(resource) 
{
	var default_disp = false;
	
	if ( resource.type == "sensor"  || resource.type == "system" ) 
	{
		default_disp = true;
		if ( resource.type == "sensor" ) {
			addResource({"type" : "cloud", "name" : "sensor"})
		}
	}
	
	else if ( resource.type == "geolocalisation" ) 
	{
		if(navigator.geolocation) 
		{
			geolocalisation_enabled = true;
		}
		else 
		{
			geolocalisation_enabled = false;
		}
	}
	
	addResource(resource, default_disp);


	updateDisplay();
});

socket.on('system', function(v) 
{
	var system = getResources("system","cpu");

	if ( system ) {
		if ( system.canvas_cpu ) {
			system.canvas_cpu.setValue(v.cpu);
		}

		if ( system.canvas_ram ) {
			system.canvas_ram.setValue(v.ram);
		}
	}
})

socket.on('gps', function(position) 
{
	console.log(position.latitude +" : "+position.longitude);

	if ( geolocalisation_enabled ) 
	{
		showCurrentLocation(position.latitude, position.longitude);
	}
})

/*-------------------------------------------------------------------------------------------------------------------*/
/*  To Client   */
/*-------------------------------------------------------------------------------------------------------------------*/

function command(resource,cmd) {
	if ( resource ) {
		console.log("command : " + resource.type + "." + resource.name + "->" + JSON.stringify(cmd))
		socket.emit("command", resource, cmd )
	}
}
 
 // 300 20 39   