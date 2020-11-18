var express = require('express');
var app = express();
var server = require('http').Server(app);
console.log(server)
var io = require('socket.io').listen(server);
const utils = require('./utils');


app.use(express.static(__dirname + '/public'));
 
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

game_state = {
  status: "InGame",
  cards_in_zones: {'zone1':['J'], 'zone2':['C5','C6'], 'zone3':[]},
  socket_id_to_player_id: new Map(),
  last_events: {},
};

// self.add_new_card('zone1', undefined, 'J', 'cards','joker','back');
// self.add_new_card('zone2', undefined, 'C5', 'cards','clubs5','back');
// self.add_new_card('zone2', undefined, 'C6', 'cards','clubs6','back');


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
  game_state.last_events[player_id]=-1;
  console.log(game_state.last_events);

  socket.on('disconnect', function () {
    game_state.socket_id_to_player_id.delete(socket.id);
    console.log('user disconnected', socket.id);          
  }); 

  socket.on('cardMoved', function (event_index, src_zone_id, dst_zone_id, card_ids, dst_pos_in_zone) {
    console.log('cardMoved', game_state.socket_id_to_player_id.get(socket.id), event_index, card_ids, src_zone_id, dst_zone_id, dst_pos_in_zone);
/*     let index = game_state.cards_in_zone[src_zone_id].indexOf(card_id);
    if (index > -1) {
      game_state.cards_in_zone[src_zone_id].splice(index, 1);
    }
    index = game_state.cards_in_zone[dst_zone_id].indexOf(card_id);
    if (index == -1) {
      game_state.cards_in_zone[dst_zone_id].push(card_id)
    }   */  
    //socket.broadcast.emit('cardMoved', src_zone_id, dst_zone_id, card_ids, dst_pos_in_zone);    
    //console.log('player_id', game_state.socket_id_to_player_id.get(socket.id));
    // update card
    game_state.last_events[game_state.socket_id_to_player_id.get(socket.id)]=event_index;
    // remove cards from src zone
    const card_removed = utils.remove_items(game_state.cards_in_zones[src_zone_id], card_ids); 
    // add cards to src zone   
    if ((dst_pos_in_zone === undefined) || (dst_pos_in_zone === null) || (dst_pos_in_zone>= game_state.cards_in_zones[dst_zone_id].length)){ 
      game_state.cards_in_zones[dst_zone_id]  = game_state.cards_in_zones[dst_zone_id].concat(card_removed);
    } else {      
      game_state.cards_in_zones[dst_zone_id].splice(dst_pos_in_zone, 0, card_removed);
    }

    console.log(game_state.cards_in_zones);
    io.sockets.emit('gameStateSync', game_state.last_events, game_state.cards_in_zones);
  });  
  
});



server.listen(3000, function () {
  console.log(`Listening on ${server.address().port}`);
});