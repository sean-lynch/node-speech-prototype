'use strict';

var express = require('express'),
    app = express(),
    webPort = 3700;

var BinaryServer = require('binaryjs').BinaryServer,
    socketPort = 9001;

var speech = require('./lib/speech');


// Basic express server for hosting html and js
function startExpressServer() {
  app.use(express.static('public'));
  app.listen(webPort);
  console.log('server open on port ' + webPort);
}

// Start Websocket server for receiving audio
function startWebsocketServer(speechService) {

  var binaryServer = BinaryServer({port: socketPort});

  binaryServer.on('connection', function(client) {
    console.log('new connection');


    client.on('stream', function(stream, meta) {
      console.log('new stream');

      speech.analyzeAudioStream(stream, speechService, function(err) { console.log('callback'); console.log(err); });

      stream.on('end', function() {
        console.log('stream ended');
      });
    });
  });
}

function main() {

  speech.getSpeechService(function(err, speechService) {
    if (err) throw err;

    startWebsocketServer(speechService);
    startExpressServer();

  });
}

if (module === require.main) {
  main();
}

exports.main = main;
