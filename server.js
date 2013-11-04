#!/usr/bin/env node


var REMOTE_PORT   = 1234;
var REMOTE_ADDR   = "127.0.0.1";
var serviceSocket = null;
var wsConnection  = null;

//Create WebSocket Server
var WebSocketServer = require('websocket').server;
var http = require('http');

//Create a http server
var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

//Set http server to listen to a port
server.listen(8888, function() {
    console.log((new Date()) + ' Server is listening on port 8888');
});

//Set encapsulate http server into WebSocket server
wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  return true;
}

//Create a TCP/IP socket
serviceSocket = new require('net').Socket();
serviceSocket.connect(parseInt(REMOTE_PORT), REMOTE_ADDR);

//Handle the incoming request for WebSocket server
wsServer.on('request', function(request) {

    if (!originIsAllowed(request.origin)) {
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    if (wsConnection == null) {
      //Handle WebSocket connection
      wsConnection = request.accept('local-eftpos', request.origin);
      console.log((new Date()) + ' Connection accepted.');

      //Pass incoming data from WebSocket to TCP/IP socket
      wsConnection.on('message', function(message) {
        serviceSocket.write(message.utf8Data);
      });

      //Handle WebSocket Closure
      wsConnection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + wsConnection.remoteAddress + ' disconnected.');
        wsConnection = null;
      });
    } else {

      //Avoid duplicate connections
      var TmpWsConnection = request.accept('local-eftpos', request.origin);
      TmpWsConnection.sendUTF('duplicate-connection');
      TmpWsConnection.close();
      TmpWsConnection = null;
    }

});

//Set TCP/IP socket to pass data to WebSocket
serviceSocket.on("data", function (data) {
   console.log('<< From remote to proxy', data.toString());
   if (wsConnection != null) {
     wsConnection.sendUTF(data.toString());
     console.log('>> From proxy to client', data.toString());
   }
});