var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

app.use(express.static(__dirname + '/public'));
 
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  console.log('a user connected', socket.id);  
  
    socket.on('disconnect', function () {
    console.log('user disconnected', socket.id);          
  });  

  socket.on('cardMoved', function (gameObject, src_zone_Id, dst_zone_id) {
    console.log(gameObject)    
    console.log(src_zone_Id)    
    console.log(dst_zone_id)    
});  
});

server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});