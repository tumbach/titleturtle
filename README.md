# titleturtle

### What is it?
*Titleturtle* -- special tool for parsing metadata from audio streams.

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
      websocket.send('STATS SUB tumbach'); // subscribe to online statistics
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
- *icy* (one of deps) doesn't work with Icecast streams that don't provide `icy-metaint` header (ogg). Use mp3 or aac.
