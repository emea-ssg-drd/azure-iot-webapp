var express = require('express.io')
var uuid = require('uuid');
var fs = require('fs');


var EventHubClient = require('azure-event-hubs').Client;
var IotHubClient = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;
app = express().http().io()

var iotHubConnectionString = process.env.THINGLABS_IOTHUB_CONNSTRING || ''
var eventHubConnectionString = process.env.THINGLABS_EVENTHUB_CONNSTRING || ''
var client = EventHubClient.fromConnectionString(eventHubConnectionString, 'thinglabseventhub')

var limit=30;
var interval=1;
var sockets = [];

// Setup your sessions, just like normal.
app.use(express.cookieParser())
app.use(express.session({secret: 'thinglabs'}))

// Session is automatically setup on initial request.
app.get('/', function(req, res) {
    req.session.loginDate = new Date().toString()
    res.sendfile(__dirname + '/index.html')
});

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


app.post('/:deviceId/led/:state', function (req, res) { 
    var deviceId = req.params.deviceId;
    var ledState = req.params.state;   
    var messageData = '{"ledState":' + ledState + '}';
    
    var client = IotHubClient.fromConnectionString(iotHubConnectionString);
    client.open(function (err) {
        if (err) {
            console.Log('Could not open the connection to the service: ' + err.message);
        } else {
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
    
    res.status(200).end();
});

app.use(express.static(__dirname + '/static'));

// Instantiate an eventhub client

app.io.route('ready', function(req) {
    // For each partition, register a callback function
    client.getPartitionIds().then(function(ids) {
        ids.forEach(function(id) {
            var minutesAgo = 5;
            var before = (minutesAgo*60*1000);
            client.createReceiver('$Default', id, { startAfterTime: Date.now() - before })
                .then(function(rx) {
                    rx.on('errorReceived', function(err) { console.log(err); });
                    rx.on('message', function(message) {
                        console.log(message.body);
                        var body = message.body;
                        try {
                            app.io.broadcast('data', null, body);
                            var resource = getResources("sensor", body.sensorType);
                            if ( resource ) {
                                var data = [];
                                data[0] = (new Date()).getTime();  
                                data[1] =  body.sensorValue;
                                for(i=0; i<sockets.length; i++) {
                                    sockets[i].emit("data", resource, data);
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
});

//-----------------------------------------------------------------------------------------------------
//  Connection
//-----------------------------------------------------------------------------------------------------
app.io.sockets.on('connection', function(socket) {
 
    console.log('New connection from :  ' + socket.handshake.address);
    socket.emit('init', { interval:interval, limit:limit, time:(new Date()).getTime()} );

    sockets.push(socket);

    for(i=0;i<resources.length;i++) {
        socket.emit("add",  resources[i]);
    }

    socket.on('disconnect', function () {
      sockets.splice( sockets.indexOf(socket),1);

    })
})

app.listen(process.env.port || 7076)