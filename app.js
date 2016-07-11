var express = require('express.io')
var uuid = require('uuid');
var fs = require('fs');


var EventHubClient = require('azure-event-hubs').Client;
var IotHubClient = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;
var Device = require('azure-iot-device');

app = express().http().io()

var iotHubConnectionString = process.env.THINGLABS_IOTHUB_CONNSTRING || ''
var eventHubConnectionString = process.env.THINGLABS_EVENTHUB_CONNSTRING || ''
var client = EventHubClient.fromConnectionString(eventHubConnectionString, 'thinglabseventhub')

var limit=30;
var interval=1;
var sockets = [];
var currentResource = null;

// Setup your sessions, just like normal.
app.use(express.cookieParser())
app.use(express.session({secret: 'thinglabs'}))

// Session is automatically setup on initial request.
app.get('/', function(req, res) {
    req.session.loginDate = new Date().toString()
    res.sendfile(__dirname + '/index.html')
});

app.use(express.static(__dirname + '/static'));

//-----------------------------------------------------------------------------------------------------
//  Resources
//-----------------------------------------------------------------------------------------------------

var resources = [];

function getResource(obj){
    for(i=0; i<resources.length; i++) {
        if ( resources[i].obj == obj ) {
            return resources[i];
        }
    }
    return null;
}

function getLocalResource(resource){
    if ( resource ) {
        return getResources(resource.type, resource.name)
    }
    return null;
}

function getResources(type,name) {
    
    var rlist = [];
    for(i=0; i<resources.length; i++) {
        if ( type == resources[i].oic_type && name == null ) {
            return resources[i];
        }
        else if ( resources[i].type == type ) {
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

resources = JSON.parse(fs.readFileSync('./resources.js'));
resources.push ({"name":"cpu", "type":"system"})


function history(socket,data,period,resource,max) {
    var ago =  (new Date()).getTime() - period*1000;

    if ( data && data.length > 0 ) {
        var all_d=[];
        var ratio = Math.ceil(data.length/max);
        if ( ratio > 0) {
            for( i=0, sum=0, nbsamples=0, l=data.length; i<l; i++, nbsamples++) {
                if ( nbsamples == ratio || i==l-1 ) {
                    if ( nbsamples ) {
                        data[i][1] = (sum/nbsamples);
                        all_d.push(JSON.parse(data[i]));
                    }
                    nbsamples = 0;
                    sum = 0;
                }
                else {
                    sum += data[i][1];
                }
            }
        }

        if( all_d.length > 0 ) {
            socket.emit('history', resource, all_d,true);
        }
    }
}

function newData(socket,resource,data) {

    if ( resource ) {
        var now = (new Date()).getTime();

        if ( (now - resource.lastUpdateTime ) >= interval*1000 ) {

            socket.emit("data", resource, data);

            resource.lastUpdateTime = now;  
        }
    }
}

function send(resource, cmd) {
    if ( resource ) {

        var messageData = JSON.stringify({
            resourceType: resource.type,
            resourceName: resource.name,
            command:  cmd
        });
        
        var client = IotHubClient.fromConnectionString(iotHubConnectionString);
        client.open(function (err) {
            if (err) {
                console.Log('Could not open the connection to the service: ' + err.message);
            } else {
                var deviceId = Device.ConnectionString.parse(iotHubConnectionString).DeviceId;
for(var s=0; s<sockets.length;s++) {
          socket[s].emit("log",  "deviceId: "+deviceId);  
        }
                client.send(deviceId, messageData, function (err) {
                    if (err) {
                        console.Log('Could not send the message to the service: ' + err.message);
                    } else {
                        client.close(function (err) {
                            if (err) {
                                console.Log('Could not close the connection to the service: ' + err.message);
                            }
                        });
                    }
                });
            }
        });

    }
}

function receive() {
    // For each partition, register a callback function
    client.getPartitionIds().then(function(ids) {
        ids.forEach(function(id) {
            client.createReceiver('$Default', id, { startAfterTime: Date.now() })
                .then(function(rx) {
                    rx.on('errorReceived', function(err) {
                        console.log(err); 
                    });
                    rx.on('message', function(message) {
                        var body = message.body;
for(var s=0; s<sockets.length;s++) {
          socket[s].emit("log",  body);  
        }
                        try {
                            var resource = getResources("sensor", body.sensorType);
                            if ( resource ) {
                                var data = [];
                                data.push([(new Date()).getTime(), body.sensorValue]);
                                for(i=0; i,sockets.length; i++) {
                                    newData(sockets[i],resource,data);
                                }
                            }
                            else if ( resource == getResources("system", body.sensorType) ) {
                                for(i=0; i<sockets.length; i++) {
                                    sockets[i].emit('system', { cpu:body.cpu, ram: body.ram });
                                }
                            }
                        } catch (err) {
                            console.log("Error sending: " + body);
                            console.log(typeof(body));
                        }
                    });
                });
        });
    });
};

//-----------------------------------------------------------------------------------------------------
//  Connection
//-----------------------------------------------------------------------------------------------------
app.io.sockets.on('connection', function(socket) {
 
    console.log('New connection from :  ' + socket.handshake.address);
     for(var s=0; s<sockets.length;s++) {
          socket[s].emit("log",  "New connection from :  ");  
        }
    socket.emit('init', { interval:interval, limit:limit, time:(new Date()).getTime()} );

    sockets.push(socket);

    for(i=0;i<resources.length;i++) {
        resources[i].lastUpdateTime = (new Date()).getTime();
        socket.emit("add",  resources[i]);
    }
    
   if ( sockets.length == 1 ) {
        receive();
   }

    socket.on( 'selectResource', function(resource) {
        currentResource = getLocalResource(resource);
        if ( currentResource ) {
            currentResource.lastUpdateTime = (new Date()).getTime();
        }
    });

    socket.on( 'command', function(resource, cmd) {
        console.log("Command : "+resource.oic_type + " -> "+JSON.stringify(cmd));
        resource = getLocalResource(resource);

        for(var s=0; s<sockets.length;s++) {
          socket[s].emit("log",  "Command : "+resource.oic_type + " -> "+JSON.stringify(cmd));  
        }
        if ( resource ) {
            send(resource,cmd);  
        }
    });


    socket.on( 'reqint', function(d) {
        if(!isNaN(d)) {
            console.log('setting update interval to %d.', d);
            interval = d;
            socket.broadcast.emit('setint', d);
        }
    });

    socket.on( 'reqlimit', function(d) {
        if(!isNaN(d)) {
            limit = d;
            if ( currentResource ) {
                history(socket,null,limit,currentResource,500);
            }
        }
    });


    socket.on('disconnect', function () {
      sockets.splice( sockets.indexOf(socket),1);

    })
})

app.listen(process.env.port || 7076)