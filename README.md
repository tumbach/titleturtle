# titleturtle

### What is it?
*Titleturtle* -- special tool for parsing metadata from audio streams.

### Install
```
git clone https://github.com/tumbach/titleturtle
cd titleturtle
npm install   # or `yarn install`
cp app/config.js.example app/config.js

# change your config

npm start     # or `yarn start`
```

### Usage
```js
let websocket = new WebSocket("ws://localhost:8080/ws");
    websocket.onopen = () => {
      websocket.send('STATS SBCR tumbach');
      websocket.send('SBCR tumbach');
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
- *icy* (one of deps) doesn't work with some OGG/AAC streams.