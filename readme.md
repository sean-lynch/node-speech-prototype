

## Project setup

    $ brew install sox
    $ npm install
    $ nvm use

## Running

    $ export GOOGLE_APPLICATION_CREDENTIALS=<PATH-TO-CLOUD-SPEECH-CREDENTIALS.json>

    $ node recognize.js

## Problems

- The transcription feed seems to die randomly, need to debug why
- No capitalization, no grammar
- No recognizing speaker
