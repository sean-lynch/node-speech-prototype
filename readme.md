

## Project setup

    $ brew install sox
    $ npm install
    $ nvm use

## Running

    $ export GOOGLE_APPLICATION_CREDENTIALS=<PATH-TO-CLOUD-SPEECH-CREDENTIALS.json>

    $ node recognize.js

    Or if you want to run the server:

    $ node server-recognize.js

    Then visit [http://localhost:3700](http://localhost:3700/). The output still appears in the server console.

## Problems

- The transcription feed seems to die randomly, need to debug why
- No capitalization, no grammar
- No recognizing speaker
