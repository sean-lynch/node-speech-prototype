'use strict';

var async = require('async'),
    record = require('./lib/record'),
    speech = require('./lib/speech');

function startRecording(speechService, cb) {
  // Stream the audio to the Speech API
  var audioStream = record.start({
    sampleRate : 16000,
    verbose : false
  })

  speech.analyzeAudioStream(audioStream, speechService, cb);
}

// [END send_request]

function main(callback) {
  async.waterfall([
    speech.getSpeechService,
    startRecording,
  ], function(err) {
    if (err) {
      throw err;
    }
  });
}

// [START run_application]
if (module === require.main) {
  main();
}
// [END run_application]

exports.main = main;
