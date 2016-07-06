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
		}
]

