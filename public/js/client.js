window.recording = false;
window.stream = null;

// Used to get around platform endian issues with Float32
function convertoFloat32ToInt16(buffer) {
  var l = buffer.length;
  var buf = new Int16Array(l);

  while (l--) {
    //buf[l] = buffer[l]*0xFFFF;    //convert to 16 bit
    // Replaced with a better solution that reduces clipping
    // http://stackoverflow.com/questions/33738873/float32-to-int16-javascript-web-audio-api
    s = Math.max(-1, Math.min(1, buffer[l]));
    buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return buf.buffer;
}

function confirmGetUserMedia() {
  if (!navigator.getUserMedia) {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                             navigator.mozGetUserMedia || navigator.msGetUserMedia;
  }

  if (navigator.getUserMedia) {
    navigator.getUserMedia({audio:true}, audioRequestSuccess, function(e) {
      alert('Error capturing audio.');
    });
  } else {
    alert('getUserMedia not supported in this browser.');
  }
}

function audioRequestSuccess(stream) {
  var audioContext = window.AudioContext || window.webkitAudioContext,
      context = new audioContext(),
      audioInput = context.createMediaStreamSource(stream), // the sample rate is in context.sampleRate
      bufferSize = 2048,
      recorder = context.createScriptProcessor(bufferSize, 1, 1),
      //resampler = new Resampler(44100, 44100, 1, new Float32Array(bufferSize)); // Can't use current API
      resampler = new Resampler(44100, 16000, 1, 16000/44100*bufferSize)

  recorder.onaudioprocess = function(audioProcessingEvent) {
    if (!window.recording) return;
    console.log('recording');
    var buffer = audioProcessingEvent.inputBuffer.getChannelData(0);
    var resampled = resampler.resampler(buffer);
    window.stream.write(convertoFloat32ToInt16(resampled));
  };

  audioInput.connect(recorder);
  recorder.connect(context.destination);
}

(function(window) {
  var client = new BinaryClient('ws://localhost:9001');

  client.on('open', function() {
    window.stream = client.createStream();

    confirmGetUserMedia();

    window.startRecording = function() {
      window.recording = true;
    };

    window.stopRecording = function() {
      window.recording = false;
      window.stream.end();
    };
  });
})(this);
