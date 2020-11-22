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

let all_cards_prototype = [];
for (let suit of ['S', 'H', 'C','D']) {
  for (let num of ['2']){//,'4','5','6','7','8','9','10','J','Q','K','A'])
    all_cards_prototype.push(suit+num)
  }
}
all_cards_prototype.push('J1');
all_cards_prototype.push('J2');

game_state = {
  status: "InGame",
  zone_ids: [],
  cards_in_zones: {},
  card_status: {},
  socket_id_to_player_id: new Map(),
  last_events: {},
  n_active_player:5
};


layout_cfg = {  
  default_camera:{
    x:0,
    y:110,
  },
  zones:[
    {
      type: 'one_zone_per_player',
      name: 'Hand',
      starting_x: 0,
      starting_y: 380,
      step_x: 1015,
      step_y: -760,
      n_row:2,
      width : 1015,
      height : 201.5,
      fillColor : 0x333333,
      boundary_width:40,
      boundary_height:52.5,
      card_step_x:15,
      card_step_y:97.5,
      card_scale:0.5,
      local_display_other_player:2,
      local_display_current_player:0,
    },    
    {
      type: 'one_zone_per_player',
      name: 'Show',
      starting_x: 0,
      starting_y: 200,
      step_x: 308,
      step_y: -400,
      n_row:2,
      width : 280,
      height : 118.5,
      fillColor : 0x333333,
      boundary_width:40,
      boundary_height:52.5,
      card_step_x:15,
      card_step_y:30,
      card_scale:0.5,
      local_display_other_player:0,
      local_display_current_player:0,
    },
    {
      type: 'one_zone_per_player',
      name: 'Score',
      starting_x: 0,
      starting_y: 87,
      step_x: 308,
      step_y: -174,
      n_row:2,
      width : 280,
      height : 71,
      fillColor : 0x333333,
      boundary_width:22.5,
      boundary_height:28.5,
      card_step_x:7.5,
      card_step_y:15,
      card_scale:0.25,
      local_display_other_player:0,
      local_display_current_player:0,
    },
    {
      type: 'public',
      name: 'Hidden',
      x: -200,
      y: 0,      
      width : 280,
      height : 71,
      fillColor : 0x333333,
      boundary_width:22.5,
      boundary_height:28.5,
      card_step_x:7.5,
      card_step_y:15,
      card_scale:0.25,
      local_display:0,      
    },
    {
      type: 'public',
      name: 'SharedScore',
      x: 208,
      y: 0,            
      width : 480,
      height : 71,
      fillColor : 0x333333,
      boundary_width:22.5,
      boundary_height:28.5,
      card_step_x:7.5,
      card_step_y:15,
      card_scale:0.25,
      local_display:0,      
    },
    {
      type: 'public',
      name: 'CardDealer',
      x: -460,
      y: 0,            
      width : 50,
      height : 71,
      fillColor : 0x333333,
      boundary_width:22.5,
      boundary_height:28.5,
      card_step_x:0,
      card_step_y:1,
      card_scale:0.25,
      local_display:0,      
    }                               
  ],
  ui_elements:[
    {
      type: 'deck_generator',
      name: 'GenerateCard',
      target_zone: 'Hidden',
      x: -420,
      y: -30,
    },     
  ]
};



io.on('connection', function (socket) {
  console.log('a user connected', socket.id);  
  
  // assign player id from 0 to number of connected sockets.
  let player_id = "0"; 
  if (game_state.socket_id_to_player_id.size!=0){
    const all_values = Array.from(game_state.socket_id_to_player_id.values());
    console.log('current_players', all_values)
    //const max_id = String(Math.max(...all_values)+1);
    let i=0;
    while (all_values.includes(String(i))){
      i++;
      console .log(i);
    }
    //if (game_state.n_active_player< i+1){          
    player_id = String(i);
  } else {
    //game_state.n_active_player=1;
  }
  
  console.log('new assigned player id', player_id);
  game_state.socket_id_to_player_id.set(socket.id, player_id);
  //game_state.n_active_player =game_state.socket_id_to_player_id.size;
  console.log('current_players_map', game_state.socket_id_to_player_id);

  socket.emit('playerIDAssigned', game_state.socket_id_to_player_id.get(socket.id));
  game_state.last_events[player_id]=-1;
  console.log(game_state.n_active_player, game_state.last_events);
  socket.emit('resetLayout', layout_cfg, game_state.n_active_player);
  socket.emit('setGameToInitialStage');
  socket.emit('gameStateSync', game_state.last_events, game_state.cards_in_zones,  game_state.card_status);
  socket.on('disconnect', function () {
    console.log('user disconnected', socket.id);
    const player_id = game_state.socket_id_to_player_id.get(socket.id);
    game_state.socket_id_to_player_id.delete(socket.id);
    console.log('user disconnected', socket.id, player_id);          
  }); 

  socket.on('cardFlipped', function (event_index, card_ids)
  {
    console.log('cardFlipped', game_state.socket_id_to_player_id.get(socket.id), event_index, card_ids);
    game_state.last_events[game_state.socket_id_to_player_id.get(socket.id)]=event_index;
    for (const card_id of card_ids){
      game_state.card_status[card_id]=!(game_state.card_status[card_id]);
    }
    io.sockets.emit('gameStateSync', game_state.last_events, null, game_state.card_status);
  });
  
  socket.on('generateCard', function(event_index, dst_zone_id, n_decks, shuffle){
    console.log("generateCard", event_index, dst_zone_id, n_decks, shuffle);
    game_state.last_events[game_state.socket_id_to_player_id.get(socket.id)]=event_index;
    // generate new deck id
    let max_deck_num = Math.max(...game_state.zone_ids.map(zone_id=> Math.max(...game_state.cards_in_zones[zone_id].map(card_id=> card_id.split('_')[1]))));
    if (max_deck_num<0){max_deck_num=0;}
    console.log(max_deck_num);
    // for (let cards_in_zone of game_state.cards_in_zones){
    //   Math.max(...cards_in_zone.map(card_id=> card_id.split('_')[1]))
    // }
    let card_id_generated = [];

    for (let i=max_deck_num+1; i<=max_deck_num+n_decks; i++){
      const str_i = String(i);        
      card_id_generated=card_id_generated.concat(all_cards_prototype.map(card_proto => card_proto+'_'+str_i));        
    }
    for (const card_id of card_id_generated){
      game_state.card_status[card_id] = false;
    }
    if ((shuffle === undefined) || (shuffle == null) || (shuffle)){
      utils.shuffle(card_id_generated); 
    } 
    console.log(card_id_generated);
    let dst_zone = game_state.cards_in_zones[dst_zone_id];
    if (dst_zone===undefined){
      game_state.zone_ids.push(dst_zone_id);
      game_state.cards_in_zones[dst_zone_id] =  card_id_generated;
    } else {
      game_state.cards_in_zones[dst_zone_id]= game_state.cards_in_zones[dst_zone_id].concat(card_id_generated);
    }
    io.sockets.emit('gameStateSync', game_state.last_events, game_state.cards_in_zones,  game_state.card_status);
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
    if (game_state.cards_in_zones[src_zone_id]===undefined){
      game_state.zone_ids.push(src_zone_id);
      game_state.cards_in_zones[src_zone_id]=[];
    }
    if (game_state.cards_in_zones[dst_zone_id]===undefined){
      game_state.zone_ids.push(dst_zone_id);
      game_state.cards_in_zones[dst_zone_id]=[];
    }    
    const card_removed = utils.remove_items(game_state.cards_in_zones[src_zone_id], card_ids); 

    // add cards to src zone   
    if ((dst_pos_in_zone === undefined) || (dst_pos_in_zone === null) || (dst_pos_in_zone>= game_state.cards_in_zones[dst_zone_id].length)){ 
      game_state.cards_in_zones[dst_zone_id]  = game_state.cards_in_zones[dst_zone_id].concat(card_removed);
    } else {      
      game_state.cards_in_zones[dst_zone_id].splice(dst_pos_in_zone, 0, card_removed);
    }

    console.log(game_state.cards_in_zones);
    io.sockets.emit('gameStateSync', game_state.last_events, game_state.cards_in_zones, null);
  });  
  
  socket.on('resetGame', function (event_index, src_zone_id, dst_zone_id, card_ids, dst_pos_in_zone) {  
    for (let zone_id of game_state.zone_ids){
      game_state.cards_in_zones[zone_id] = [];
    }
    game_state.card_status = {};
    for (let player_id of game_state.socket_id_to_player_id.values()){
      game_state.last_events[player_id]=-1;
    }    
    io.sockets.emit('setGameToInitialStage', game_state.last_events, game_state.cards_in_zones, null);
  });
});



server.listen(3000, function() {
  console.log(`Listening on ${server.address().port}`);
});