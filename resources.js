[  
		{
		    "name": "temperature",
		    "type": "sensor",
		    "input": 
		    	{
		    		"gpio": 0
		    	},
		    "output": 
    			{
		  			"min": 	-20,
		  			"max": 60,
		  			"threshold": 40,
					"unit": "C"
    			}
		},

		{
		    "name": "light",
		    "type": "sensor",
		    "input": 
		    	{
		    		"gpio": 1
		    	},
		    "output" : 
    			{
		  			"min": 	1,
		  			"max": 120,
		  			"threshold": 60,
					"unit": "Lux"
    			}
		},

		{
		    "name": "sound",
		    "type": "sensor",
		    "input": 
		    	{
		    		"gpio": 3

		    	},
		    "output": 
    			{
		  			"min": 	0,
		  			"max": 250,
		  			"threshold": 200,
					"unit" : ""
    			}
		},

		{
		    "name": "proximity",
		    "type": "sensor",
		    "input": 
		    	{
		    		"gpio": 2
		    	},
		    "output": 
    			{
		  			"min": 	0,
		  			"max": 80,
		  			"threshold": 20,
					"unit": "cm"
    			}
		},
		{
		    "name": "webcam",
		    "type": "video",
		    "input": 
		    	{
		    		"url": "video.mp4",
		    	
				    "targets":
				    	[
					    	{
					    		"target": "default",
					    		"angle": 90
					    	},
					    	{
					    		"target": "doorbell.main",
					    		"angle": 30
					    	},
					    	{
					    		"target": "door.garage",
					    		"angle": 60
					    	}
				    	]
				}
		},

		{
		    "name": "livingroom",
		    "type": "lighting"
		},

		{
		    "name": "livingroom",
		    "type": "heater",
		    "input": 
		    	{
		    		"gpio": 2,
		    		"direction": "output"
		    	}
		},

		{
		    "name": "main",
		    "type": "alarm",
		    "input": 
		    	{
		    		"gpio": 9,
		    		"direction": "output"
		    	}
		},

		{
		    "name": "garage",
		    "type": "door",
		    "input": 
		    	{
		    		"direction": "output",
		    		"gpio": {
		    					"open":4, 
		    					"close":6
		    				}
		    	}
		},

		{
		    "name": "webcam",
		    "type": "servo2",
		    "input": 
		    	{
		    		"gpio": 5,
		    		"direction": "output"
		    	}
		},

		{
		    "name": "car",
		    "type": "light",
		    "input": 
		    	{
		    		"gpio": 5,
		    		"direction": "output"
		    	}
		},
		{
		    "name": "main",
		    "type": "doorbell",
		    "input": 
		    	{
		    		"gpio": 7,
		    		"direction": "input"
		    	}
		},
		{
		    "name": "lcd",
		    "type": "xdisplay"
		}
]

