'use strict';

var path = require('path'),
    grpc = require('grpc'),
    googleProtoFiles = require('google-proto-files'),
    googleAuth = require('google-auto-auth');

var Transform = require('stream').Transform;

// https://github.com/grpc/grpc/blob/9cb96ba4f05a2e9df2ad038f24f53a8e5eafd9c3/src/node/index.js#L81
var PROTO_ROOT_DIR = googleProtoFiles('..');
var protoDescriptor = grpc.load({
  root: PROTO_ROOT_DIR,
  file: path.relative(PROTO_ROOT_DIR, googleProtoFiles.speech.v1beta1)
}, 'proto', {
  binaryAsBase64: true,
  convertFieldsToCamelCase: true
});
var speechProto = protoDescriptor.google.cloud.speech.v1beta1;



exports.getSpeechService = function (callback) {

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return callback('GOOGLE_APPLICATION_CREDENTIALS not set');
  }

  // https://www.npmjs.com/package/google-auto-auth
  // looks for .json credentials file using GOOGLE_APPLICATION_CREDENTIALS env variable
  var googleAuthClient = googleAuth({
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform'
    ]
  });

  // calls callback with instance of https://github.com/maxogden/googleauth
  googleAuthClient.getAuthClient(function (err, authClient) {
    if (err) {
      console.log(err);
      return callback(err);
    }

    // grpc handles generic and google-only credentials. See:
    // http://www.grpc.io/docs/guides/auth.html#nodejs
    var credentials = grpc.credentials.combineChannelCredentials(
      grpc.credentials.createSsl(),
      grpc.credentials.createFromGoogleCredential(authClient)
    );

    // Create a gRPC client that uses the google.cloud.speech.v1beta1 proto definition
    console.log('Loading speech service...');
    var stub = new speechProto.Speech('speech.googleapis.com', credentials);

    //console.log(speechProto);
    return callback(null, stub);
  });
}


function handleRecognizeResponse(recognizeResponse) {
  if (recognizeResponse) {
    if (recognizeResponse.results && recognizeResponse.results.length && recognizeResponse.results[0].isFinal) {
      //console.log(JSON.stringify(recognizeResponse.results, null, 2));
      console.log(recognizeResponse.results[0].alternatives[0].transcript);
    }
    if (recognizeResponse.endpointerType != 'ENDPOINTER_EVENT_UNSPECIFIED') {
      // ENDPOINTER_EVENT_UNSPECIFIED are interm and final results which will be printed above
      console.log(recognizeResponse.endpointerType);
    }
  }
}

var streamingRecognizeRequest = null;

function startStreamingRecognizeRequest(speechService, cb) {
  streamingRecognizeRequest = speechService.streamingRecognize();

  // Listen for various responses
  streamingRecognizeRequest.on('error', cb);
  streamingRecognizeRequest.on('data', handleRecognizeResponse);

  // Write the initial recognize reqeust
  streamingRecognizeRequest.write({
    streamingConfig: {
      config: {
        encoding: 'LINEAR16',
        sampleRate: 16000
      },
      interimResults: true,
      singleUtterance: false
    }
  });

  streamingRecognizeRequest.on('end', function () {
    console.log('got call end, auto-reconnect because f you google');

    // TODO this doesn't actually work. Need to figure out how to wrangle streams better.
    startStreamingRecognizeRequest(speechService, cb);
  });
}


exports.analyzeAudioStream = function (stream, speechService, cb) {
  console.log('Analyzing speech...');

  startStreamingRecognizeRequest(speechService, cb);

  var toRecognizeRequest = new Transform({ objectMode: true });
  toRecognizeRequest._transform = function (chunk, encoding, done) {
    done(null, {
      audioContent: chunk
    });
  };

  // Stream the audio to the Speech API
  stream.pipe(toRecognizeRequest).pipe(streamingRecognizeRequest);
}
