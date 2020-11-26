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
  for (let num of ['2','3','4','5','6','7','8','9','10','J','Q','K','A']){
    all_cards_prototype.push(suit+num)
  }
}
all_cards_prototype.push('J1');
all_cards_prototype.push('J2');

game_state = {
  status: "Waiting",
  zone_ids: [],
  cards_in_zones: {},
  card_status: {},
  socket_id_to_player_id: new Map(),
  socket_id_to_player_info: new Map(),
  last_events: {},
  n_active_player:0,  
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
      starting_x: 35,
      starting_y: 200,
      step_x: 308,
      step_y: -400,
      n_row:2,
      width : 210,
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
      name: 'Trash',
      starting_x: -115,
      starting_y: 200,
      step_x: 308,
      step_y: -400,
      n_row:2,
      width : 65,
      height : 71,
      fillColor : 0x333333,
      boundary_width:22.5,
      boundary_height:28.5,
      card_step_x:0,
      card_step_y:15,
      card_scale:0.25,
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
      generate_button_label: 'NewCards',
      target_zone: 'CardDealer',
      x: -430,
      y: -25,
      input: {
        default: '4',
      },
      label: {
        offset_x: 0, offset_y: -15, text: '#Decks',
      },
      input: {
        offset_x: 80, offset_y: -8, default: '4',
      }      
    },     
    {
      type: 'simple_event',
      name: 'Reset Game',   
      event_name: 'resetGame',
      button_label: 'New Round',   
      x: 500,
      y: 0,
    },   
    {
      type: 'simple_event',
      name: 'Return To Game Room', 
      event_name: 'exitToGameRoom',  
      button_label: 'Reset To Game Room',   
      x: 500,
      y: 25,
    },     
    {
      type: 'deal_cards',
      name: 'DealCards',
      x: -430,
      y: -5,
      button_label: 'DealCards',
      move_card_cfg: [
        {
          type: 'ui',          
          src_zone_id: 'CardDealer',
          dst_zone_type: 'zone_group',
          dst_zone_group_name: 'Hand',
          label: {
            offset_x: 0, offset_y: 15, text: 'PerPlayer',
          },
          input: {
            offset_x: 80, offset_y: 22, default: '52',
          }
        },
        {
          type: 'ui',          
          src_zone_id: 'CardDealer',
          dst_zone_type: 'zone',
          dst_zone_id: 'Hidden',
          label: {
            offset_x: 0, offset_y: 30, text: 'Hidden',
          },
          input: {
            offset_x: 80, offset_y: 38, default: '8',
          }
        },        
      ]
    },
  ]
};

function get_currently_connected_active_players(){
  const all_player_id = Array(...game_state.socket_id_to_player_id.values())
  const n_active_player = all_player_id.filter(player_id => Math.floor(player_id)>=0).length;
  return n_active_player
}
// function update_num_player(){
//   const all_player_id = Array(...game_state.socket_id_to_player_id.values())
//   const n_active_player = all_player_id.filter(player_id => Math.floor(player_id)>=0).length;
//   console.log('calculated_players', n_active_player)
// }

function get_available_player_id(){
  let player_id = "0"; 
  if (game_state.socket_id_to_player_id.size!=0){
    const all_values = Array.from(game_state.socket_id_to_player_id.values());
    console.log('current_players', all_values)
    //const max_id = String(Math.max(...all_values)+1);
    let i=0;
    while (all_values.includes(String(i))){
      i++;      
    }
    //if (game_state.n_active_player< i+1){          
    player_id = String(i);
  } 
  return player_id;
}
  
function reset_state_to_waiting(){
  game_state.zone_ids=[];
  game_state.cards_in_zones={};
  game_state.card_status = {};
  game_state.last_events={};
  game_state.socket_id_to_player_id.clear();
  game_state.socket_id_to_player_info.clear();
  game_state.status='Waiting';
  game_state.n_active_player=0;
}


io.on('connection', function (socket) {
  console.log('a user connected', socket.id);  
  
  game_state.socket_id_to_player_info.set(socket.id, {player_name:'', player_type:'Unassigned', player_id:''});
  
  // Game Room functionality
  socket.on('updatePlayerName', function(player_name){
    if (!game_state.socket_id_to_player_info.has(socket.id)){
      game_state.socket_id_to_player_info.set(socket.id, {player_name:'', player_type:'Unassigned', player_id:''});
    }
    game_state.socket_id_to_player_info.get(socket.id).player_name =player_name;
    io.sockets.emit('playerInfo', Array(...game_state.socket_id_to_player_info.values()));
  });
  
  socket.on('observeGame', function(){
    if (!game_state.socket_id_to_player_info.has(socket.id)){
      game_state.socket_id_to_player_info.set(socket.id, {player_name:'', player_type:'Unassigned', player_id:''});
    }    
    game_state.socket_id_to_player_info.get(socket.id).player_type ='Observer';
    io.sockets.emit('playerInfo', Array(...game_state.socket_id_to_player_info.values()));
  });  

  socket.on('joinGame', function(){

    const connected_active_players = get_currently_connected_active_players();
    if (connected_active_players!=game_state.n_active_player){
      // provide a ID and allow to join
      const player_id = get_available_player_id();
      game_state.socket_id_to_player_id.set(socket.id, player_id);
      game_state.socket_id_to_player_info.get(socket.id).player_type ='Player';
      game_state.socket_id_to_player_info.get(socket.id).player_id =player_id;
      socket.emit('playerIDAssigned', player_id);
      socket.emit('startGameFromGameRoom');   
    } else {
      if (!game_state.socket_id_to_player_info.has(socket.id)){
        game_state.socket_id_to_player_info.set(socket.id, {player_name:'', player_type:'Unassigned'});
      }    
      game_state.socket_id_to_player_info.get(socket.id).player_type ='Player';
      io.sockets.emit('playerInfo', Array(...game_state.socket_id_to_player_info.values()));
    }
  });  
  
  socket.on('startGame', function(){
    // reset all player id
    game_state.socket_id_to_player_id.clear();
    
    for (let [socket_id, player_info] of game_state.socket_id_to_player_info){
      if (player_info.player_type == 'Player'){
        const player_id = get_available_player_id()
        game_state.socket_id_to_player_id.set(socket_id, player_id);
        game_state.socket_id_to_player_info.get(socket_id).player_id = player_id;

      } else if (player_info.player_type == 'Observer'){
        game_state.socket_id_to_player_id.set(socket_id, '-1');
        game_state.socket_id_to_player_info.get(socket_id).player_id ='-1';
      }
    }
    for (let [socket_id, player_id] of game_state.socket_id_to_player_id){
      io.to(socket_id).emit('playerIDAssigned', player_id);
    } 

    console.log('starting game');    
    game_state.n_active_player = get_currently_connected_active_players();

    game_state.status='InGame';//switch to InGame
    io.sockets.emit('startGameFromGameRoom');      
  });    
  // // assign player id from 0 to number of connected sockets.
  // let player_id = "0"; 
  // if (game_state.socket_id_to_player_id.size!=0){
  //   const all_values = Array.from(game_state.socket_id_to_player_id.values());
  //   console.log('current_players', all_values)
  //   //const max_id = String(Math.max(...all_values)+1);
  //   let i=0;
  //   while (all_values.includes(String(i))){
  //     i++;
  //     console .log(i);
  //   }
  //   //if (game_state.n_active_player< i+1){          
  //   player_id = String(i);
  // } else {
  //   //game_state.n_active_player=1;
  // }
  
  // console.log('new assigned player id', player_id);
  // game_state.socket_id_to_player_id.set(socket.id, player_id);
  //game_state.n_active_player =game_state.socket_id_to_player_id.size;
  console.log('current_players_map', game_state.socket_id_to_player_id);

  //socket.emit('playerIDAssigned', game_state.socket_id_to_player_id.get(socket.id));
  // game_state.last_events[player_id]=-1;
  console.log(game_state.n_active_player, game_state.last_events);
  //socket.emit('resetLayout', layout_cfg, game_state.n_active_player);
  //socket.emit('setGameToInitialStage');
  //socket.emit('gameStateSync', game_state.last_events, game_state.cards_in_zones,  game_state.card_status);
  socket.on('disconnect', function () {
    console.log('user disconnected', socket.id);
    const player_id = game_state.socket_id_to_player_id.get(socket.id);
    game_state.socket_id_to_player_id.delete(socket.id);
    game_state.socket_id_to_player_info.delete(socket.id);
    console.log('user disconnected', socket.id, player_id);
    if (game_state.status=='InGame'){
      const n_player= get_currently_connected_active_players();
      if (n_player==0){
        reset_state_to_waiting();
        socket.broadcast.emit('returnToGameRoom');          
      } else {
        socket.broadcast.emit('playerInfo', Array(...game_state.socket_id_to_player_info.values()));          
      }
    }
  }); 

  socket.on('exitToGameRoom', function(){
    console.log("exit_to game room")
    reset_state_to_waiting();
    io.sockets.emit('returnToGameRoom');       
  });
  socket.on('requestLayout', function(){
    socket.emit('resetLayout', layout_cfg, game_state.n_active_player, Array(...game_state.socket_id_to_player_info.values()));
  });
  socket.on('requestGameSync', function(){    
    socket.emit('gameStateSync', game_state.last_events, game_state.cards_in_zones,  game_state.card_status);    
  })
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
    //console.log(max_deck_num);
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
    //console.log(card_id_generated);
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

    //console.log(game_state.cards_in_zones);
    io.sockets.emit('gameStateSync', game_state.last_events, game_state.cards_in_zones, null);
  });  
  
  socket.on('requestGameStatus', function(){
    socket.emit('returnGameStatus', game_state.status, Array(...game_state.socket_id_to_player_info.values()));    
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