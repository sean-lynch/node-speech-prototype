'use strict';

var record = require('./record');
var async = require('async');
var fs = require('fs');
var path = require('path');
var grpc = require('grpc');
var googleProtoFiles = require('google-proto-files');
var googleAuth = require('google-auto-auth');
var Transform = require('stream').Transform;

// [START proto]
var PROTO_ROOT_DIR = googleProtoFiles('..');

// https://github.com/grpc/grpc/blob/9cb96ba4f05a2e9df2ad038f24f53a8e5eafd9c3/src/node/index.js#L81
var protoDescriptor = grpc.load({
  root: PROTO_ROOT_DIR,
  file: path.relative(PROTO_ROOT_DIR, googleProtoFiles.speech.v1beta1)
}, 'proto', {
  binaryAsBase64: true,
  convertFieldsToCamelCase: true
});
var speechProto = protoDescriptor.google.cloud.speech.v1beta1;
// [END proto]

// [START authenticating]
function getSpeechService (callback) {

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
// [END authenticating]

// [START send_request]
function sendRequest (speechService, cb) {
  console.log('Analyzing speech...');
  var responses = [];
  var call = speechService.streamingRecognize();

  // Listen for various responses
  call.on('error', cb);
  call.on('data', function (recognizeResponse) {
    if (recognizeResponse) {
      responses.push(recognizeResponse);
      if (recognizeResponse.results && recognizeResponse.results.length && recognizeResponse.results[0].isFinal) {
        //console.log(JSON.stringify(recognizeResponse.results, null, 2));
        console.log(recognizeResponse.results[0].alternatives[0].transcript);
      }
      if (recognizeResponse.endpointerType != 'ENDPOINTER_EVENT_UNSPECIFIED') {
        // ENDPOINTER_EVENT_UNSPECIFIED are interm and final results which will be printed above
        console.log(recognizeResponse.endpointerType);
      }
    }
  });
  call.on('end', function () {
    //console.log(responses);
    cb(null, responses);
  });

  // Write the initial recognize reqeust
  call.write({
    streamingConfig: {
      config: {
        encoding: 'LINEAR16',
        sampleRate: 16000
      },
      interimResults: true,
      singleUtterance: false
    }
  });

  var toRecognizeRequest = new Transform({ objectMode: true });
  toRecognizeRequest._transform = function (chunk, encoding, done) {
    done(null, {
      audioContent: chunk
    });
  };

  // Stream the audio to the Speech API
  record.start({
    sampleRate : 16000,
    verbose : false
  }).pipe(toRecognizeRequest)
    .pipe(call);
}
// [END send_request]

function main (callback) {
  async.waterfall([
    getSpeechService,
    sendRequest,
  ]);
}

// [START run_application]
if (module === require.main) {
  main();
}
// [END run_application]

exports.main = main;
