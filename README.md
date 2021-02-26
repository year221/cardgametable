# cardgametable
A web-based virtual reconfigurable gametable for playing card games.

This is a translation / improvement of Python pyarcade + zeroMQ based cardgameFYF into javascript-based web game.

Game server is available at: cardgame.ga

## Build docker image

```
$ docker build -t <container name> .
```

## Run the image
```
# docker run -p 8080:3000 -d <container name>
```

## Logging
1. Set environment variable DEBUG to 'socket.io*'.
```
$env:DEBUG="socket.io*"
```
2. Run node and redirect stdout and stderr to two txt files on the public folder. 
```
node server/server.js > .\server\public\serverlog.txt 2> .\server\public\serverlog2.txt
```
