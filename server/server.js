var express = require('express');
var app = express();
var server = require('http').Server(app);
console.log(server)
var io = require('socket.io').listen(server);

app.use(express.static(__dirname + '/public'));
 
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

game_state = {
  status: "InGame",
  cards_in_zone: new Map(),
  socket_id_to_player_id: new Map(),
};

game_state.cards_in_zone['zone1'] = ['1'];
game_state.cards_in_zone['zone2'] = ['2'];

io.on('connection', function (socket) {
  console.log('a user connected', socket.id);  
  
  // assign player id
  let player_id = "0"; 
  if (game_state.socket_id_to_player_id.size!=0){
    player_id = String(Math.max(...game_state.socket_id_to_player_id.values())+1);
  }
  console.log('new assigned player id', player_id);
  game_state.socket_id_to_player_id.set(socket.id, player_id);
  socket.emit('playerIDAssigned', game_state.socket_id_to_player_id.get(socket.id));

  socket.on('disconnect', function () {
    game_state.socket_id_to_player_id.delete(socket.id);
    console.log('user disconnected', socket.id);          
  }); 

  socket.on('cardMoved', function (src_zone_id, dst_zone_id, card_ids, dst_pos_in_zone) {
    console.log(card_ids, src_zone_id, dst_zone_id, dst_pos_in_zone);
/*     let index = game_state.cards_in_zone[src_zone_id].indexOf(card_id);
    if (index > -1) {
      game_state.cards_in_zone[src_zone_id].splice(index, 1);
    }
    index = game_state.cards_in_zone[dst_zone_id].indexOf(card_id);
    if (index == -1) {
      game_state.cards_in_zone[dst_zone_id].push(card_id)
    }   */  
    socket.broadcast.emit('cardMoved', src_zone_id, dst_zone_id, card_ids, dst_pos_in_zone);    
  });  
  
});



server.listen(3000, function () {
  console.log(`Listening on ${server.address().port}`);
});