var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

app.use(express.static(__dirname + '/public'));
 
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

game_state = {
  status: "InGame",
  cards_in_zone: new Map()
}

game_state.cards_in_zone['zone1'] = ['1'];
game_state.cards_in_zone['zone2'] = ['2'];

io.on('connection', function (socket) {
  console.log('a user connected', socket.id);  
  
    socket.on('disconnect', function () {
    console.log('user disconnected', socket.id);          
  });  

  socket.on('cardMoved', function (card_id, src_zone_id, dst_zone_id, dst_pos_in_zone) {
    console.log(card_id, src_zone_id, dst_zone_id, dst_pos_in_zone)    
/*     let index = game_state.cards_in_zone[src_zone_id].indexOf(card_id);
    if (index > -1) {
      game_state.cards_in_zone[src_zone_id].splice(index, 1);
    }
    index = game_state.cards_in_zone[dst_zone_id].indexOf(card_id);
    if (index == -1) {
      game_state.cards_in_zone[dst_zone_id].push(card_id)
    }   */  
    socket.broadcast.emit('cardMoved', card_id, src_zone_id, dst_zone_id, dst_pos_in_zone);    
  });  
});

server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});