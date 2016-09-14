'use strict';

var express = require('express'),
    app = express(),
    webPort = 3700;

var BinaryServer = require('binaryjs').BinaryServer,
    socketPort = 9001;

var wav = require('wav'),
    outFile = 'demo.wav',
    exec = require('child_process').exec;


// Basic express server for hosting html and js
function startExpressServer() {
  app.use(express.static('public'));
  app.listen(webPort);
  console.log('server open on port ' + webPort);
}

// Start Websocket server for receiving audio
function startWebsocketServer() {

  var binaryServer = BinaryServer({port: socketPort});

  binaryServer.on('connection', function(client) {
    console.log('new connection');

    var fileWriter = new wav.FileWriter(outFile, {
      channels: 1,
      sampleRate: 16000,
      bitDepth: 16
    });

    client.on('stream', function(stream, meta) {
      console.log('new stream');
      stream.pipe(fileWriter);

      stream.on('end', function() {
        fileWriter.end();
        console.log('stream ended, wrote to file ' + outFile);

        // Play the recorded audio
        exec('open ' + outFile);
      });
    });
  });
}

function main() {
  startWebsocketServer();
  startExpressServer();
}

if (module === require.main) {
  main();
}

exports.main = main;
