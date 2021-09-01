# titleturtle

### What is it?
*Titleturtle* -- special tool for parsing metadata from audio streams.

### How it works?

Titleturtle reads tags like *artist* and *title* directly from an audio stream, which contains Icecast metadata.

### Install
```
npm install   # or `yarn install`
cp config.js.example config.js

# change сonfig.js

npm start     # or `yarn start` or `node app`
```

### Usage
```js
let websocket = new WebSocket("ws://localhost:8080/ws");
    websocket.onopen = () => {
      websocket.send('HISTORY tumbach 5'); // request 5 last tracks <optional>
      websocket.send('SUB tumbach'); // subscribe to tag updates
    };
    websocket.onmessage = (e) => {
      try {
        let data = JSON.parse(e.data);
        console.log(data);
      } catch (e) {
        //
      }
    };
    window.onunload = () => websocket.close();
```

### Known issues
- Titleturtle is experiencing some issues during establishing a connection to https://anon.fm streams.
- Titleturtle can not choose a stream by the lowest bitrate for now. This feature would save bandwidth.
