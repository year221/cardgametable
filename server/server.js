var express = require('express');
var app = express();
var server = require('http').createServer(app);
const options = { /* ... */ };
const io = require('socket.io')(server, options);
// console.log(server)
// var io = require('socket.io').listen(server);
const utils = require('./utils');


app.use(express.static(__dirname + '/public'));
 
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// let all_cards_prototype = [];
// for (let suit of ['S', 'H', 'C','D']) {
//   for (let num of ['2','3','4','5','6','7','8','9','10','J','Q','K','A']){
//     all_cards_prototype.push(suit+num)
//   }
// }
// all_cards_prototype.push('J1');
// all_cards_prototype.push('J2');

game_state = {
  status: "Waiting",
  zone_ids: [],
  cards_in_zones: {},
  card_status: {},
  socket_id_to_player_id: new Map(),
  socket_id_to_player_info: new Map(),
  last_events: {},
  n_active_player:0,
  ui_element_sync_cache: new Map()
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
  
function can_join_game(){
  const connected_active_players = get_currently_connected_active_players();  
  return (connected_active_players < game_state.n_active_player);
}
function check_player_info(socket_id){
    if (!game_state.socket_id_to_player_info.has(socket_id)){
      game_state.socket_id_to_player_info.set(socket_id, {player_name:null, player_type:'Unassigned', player_id:''});
    }  
}
function reset_state_to_waiting(){
  game_state.zone_ids=[];
  game_state.cards_in_zones={};
  game_state.card_status = {};
  game_state.last_events={};
  game_state.socket_id_to_player_id.clear();
  //game_state.socket_id_to_player_info.clear();
  for (let [socket_id, player_info] of game_state.socket_id_to_player_info){
    player_info.player_type = 'Unassigned';
    player_info.player_id = '';
  }
  game_state.status='Waiting';
  game_state.n_active_player=0;
  game_state.ui_element_sync_cache.clear();
}


io.on('connection', function (socket) {
  console.log('a user connected', socket.id);  
  check_player_info(socket.id);
  //game_state.socket_id_to_player_info.set(socket.id, {player_name:null, player_type:'Unassigned', player_id:''});
  
  // Game Room functionality  
  socket.on('updatePlayerName', function(player_name){
    check_player_info(socket.id);    
    game_state.socket_id_to_player_info.get(socket.id).player_name =player_name;
    io.sockets.emit('playerInfo', Array(...game_state.socket_id_to_player_info.values()));
  });

  socket.on('getMyPlayerName', function(player_name){
    check_player_info(socket.id);    
    socket.emit('returnPlayerName',game_state.socket_id_to_player_info.get(socket.id).player_name);    
  });
  
  socket.on('observeGame', function(){
    check_player_info(socket.id);    
    game_state.socket_id_to_player_info.get(socket.id).player_type ='Observer';
    io.sockets.emit('playerInfo', Array(...game_state.socket_id_to_player_info.values()));
    if (game_state.status=='InGame'){
        game_state.socket_id_to_player_id.set(socket.id, '-1');
        game_state.socket_id_to_player_info.get(socket.id).player_id = '-1';
        socket.broadcast.emit('returnGameStatus', game_state.status, Array(...game_state.socket_id_to_player_info.values()), can_join_game());                
        socket.emit('playerIDAssigned', '-1');
        socket.emit('startGameFromGameRoom');         
    }
  });  

  socket.on('joinGame', function(){

    const connected_active_players = get_currently_connected_active_players();
    if (game_state.status=='Waiting'){
      check_player_info(socket.id);      

      game_state.socket_id_to_player_info.get(socket.id).player_type ='Player';      
      io.sockets.emit('playerInfo', Array(...game_state.socket_id_to_player_info.values()));      
    } else {
      if (connected_active_players < game_state.n_active_player){
        // provide a ID and allow to join
        const player_id = get_available_player_id();
        game_state.socket_id_to_player_id.set(socket.id, player_id);
        game_state.socket_id_to_player_info.get(socket.id).player_type ='Player';
        game_state.socket_id_to_player_info.get(socket.id).player_id =player_id;
        socket.broadcast.emit('returnGameStatus', game_state.status, Array(...game_state.socket_id_to_player_info.values()), can_join_game());        
        socket.emit('playerIDAssigned', player_id);
        socket.emit('startGameFromGameRoom');   
        socket.broadcast.emit('playerInfo', Array(...game_state.socket_id_to_player_info.values()));      
      }
    }
  });  
  
  socket.on('startGame', function(){
    // reset all player id
    if (game_state.status=='Waiting'){
      game_state.socket_id_to_player_id.clear();
      console.log('startGame', game_state.socket_id_to_player_info);
      for (let [socket_id, player_info] of game_state.socket_id_to_player_info){
        if (player_info.player_type == 'Player'){
          const player_id = get_available_player_id()
          game_state.socket_id_to_player_id.set(socket_id, player_id);
          game_state.socket_id_to_player_info.get(socket_id).player_id = player_id;
        } else if (player_info.player_type == 'Observer'){
          game_state.socket_id_to_player_id.set(socket_id, '-1');
          game_state.socket_id_to_player_info.get(socket_id).player_id ='-1';
        } else if (player_info.player_type == 'Unassigned'){
          game_state.socket_id_to_player_id.set(socket_id, '-2');
          game_state.socket_id_to_player_info.get(socket_id).player_id ='-2';
        }
      }
      console.log('Assign IDs', game_state.socket_id_to_player_id);
      for (let [socket_id, player_id] of game_state.socket_id_to_player_id){
        io.to(socket_id).emit('playerIDAssigned', player_id);
        //console.log('send ids', socket_id, player_id);
      } 

      console.log('starting game');    
      game_state.n_active_player = get_currently_connected_active_players();

      game_state.status='InGame';//switch to InGame
      io.sockets.emit('startGameFromGameRoom');    
    }  
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

  console.log(game_state.n_active_player, game_state.last_events);

  socket.on('disconnect', function (reason) {
    console.log('user disconnected', socket.id, reason);
    const player_id = game_state.socket_id_to_player_id.get(socket.id);
    game_state.socket_id_to_player_id.delete(socket.id);
    game_state.socket_id_to_player_info.delete(socket.id);
    //console.log('user disconnected', socket.id, player_id);
    if (game_state.status=='InGame'){
      const n_player= get_currently_connected_active_players();
      if (n_player==0){
        reset_state_to_waiting();
        socket.broadcast.emit('returnToGameRoom');          
      } else {
        socket.broadcast.emit('playerInfo', Array(...game_state.socket_id_to_player_info.values()));          
      }
    }
    socket.broadcast.emit('returnGameStatus', game_state.status, Array(...game_state.socket_id_to_player_info.values()), can_join_game());        
  }); 

  socket.on('exitToGameRoom', function(){
    //console.log("exit_to game room")
    reset_state_to_waiting();
    console.log(game_state);
    console.log("emit exit_to game room")
    io.sockets.emit('returnToGameRoom');       
  });
  socket.on('requestLayout', function(){
    socket.emit('resetLayout', null, game_state.n_active_player, Array(...game_state.socket_id_to_player_info.values()));
  });
  socket.on('requestGameSync', function(){    
    socket.emit('gameStateSync', game_state.last_events, game_state.cards_in_zones,  game_state.card_status);    
  })
  socket.on('cardFlipped', function (event_index, card_id_and_faces)
  {
    console.log('cardFlipped', game_state.socket_id_to_player_id.get(socket.id), event_index, card_id_and_faces);
    game_state.last_events[game_state.socket_id_to_player_id.get(socket.id)]=event_index;
    for (const [card_id, face_up] of card_id_and_faces){
      game_state.card_status[card_id]=face_up;
    }
    io.sockets.emit('gameStateSync', game_state.last_events, null, game_state.card_status);
  });
  
  socket.on('addNewCard', function(event_index, dst_zone_id, card_ids, card_status, strict){
    console.log("addNewCard", event_index, dst_zone_id, card_ids, card_status, strict);
    game_state.last_events[game_state.socket_id_to_player_id.get(socket.id)]=event_index;
    
    if ((strict===undefined) || (strict===null)){
      strict =true;
    }
    // remove card that already exists    
    let new_card_ids = card_ids.filter(card_id => !game_state.card_status.hasOwnProperty(card_id))
    // if strict, then if any card_id already exist, we will not add the whole set of cards. 
    if ((!strict) || (new_card_ids.length==card_ids.length)){               
       if (game_state.cards_in_zones[dst_zone_id]===undefined){
         game_state.zone_ids.push(dst_zone_id);
         game_state.cards_in_zones[dst_zone_id]=[];
       }       
       game_state.cards_in_zones[dst_zone_id]  = game_state.cards_in_zones[dst_zone_id].concat(new_card_ids); 
       for (let card_id in new_card_ids){
          game_state.card_status[card_id]=card_status[card_id];
       }
    }
    io.sockets.emit('gameStateSync', game_state.last_events, game_state.cards_in_zones,  game_state.card_status);
  });
  // socket.on('generateCard', function(event_index, dst_zone_id, n_decks, shuffle){
  //   console.log("generateCard", event_index, dst_zone_id, n_decks, shuffle);
  //   game_state.last_events[game_state.socket_id_to_player_id.get(socket.id)]=event_index;
  //   // generate new deck id
  //   let max_deck_num = Math.max(...game_state.zone_ids.map(zone_id=> Math.max(...game_state.cards_in_zones[zone_id].map(card_id=> card_id.split('_')[1]))));
  //   if (max_deck_num<0){max_deck_num=0;}
  //   //console.log(max_deck_num);
  //   // for (let cards_in_zone of game_state.cards_in_zones){
  //   //   Math.max(...cards_in_zone.map(card_id=> card_id.split('_')[1]))
  //   // }
  //   let card_id_generated = [];

  //   for (let i=max_deck_num+1; i<=max_deck_num+n_decks; i++){
  //     const str_i = String(i);        
  //     card_id_generated=card_id_generated.concat(all_cards_prototype.map(card_proto => card_proto+'_'+str_i));        
  //     console.log(max_deck_num, n_decks, str_i, card_id_generated.length);
  //   }
  //   for (const card_id of card_id_generated){
  //     game_state.card_status[card_id] = false;
  //   }
  //   if ((shuffle === undefined) || (shuffle == null) || (shuffle)){
  //     utils.shuffle(card_id_generated); 
  //   } 
  //   //console.log(card_id_generated);
  //   let dst_zone = game_state.cards_in_zones[dst_zone_id];
  //   if (dst_zone===undefined){
  //     game_state.zone_ids.push(dst_zone_id);
  //     game_state.cards_in_zones[dst_zone_id] =  card_id_generated;
  //   } else {
  //     game_state.cards_in_zones[dst_zone_id]= game_state.cards_in_zones[dst_zone_id].concat(card_id_generated);
  //   }
  //   io.sockets.emit('gameStateSync', game_state.last_events, game_state.cards_in_zones,  game_state.card_status);
  // });
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
    const cards_removed = utils.remove_items(game_state.cards_in_zones[src_zone_id], card_ids); 

    // add cards to dst zone   
    if ((dst_pos_in_zone === undefined) || (dst_pos_in_zone === null) || (dst_pos_in_zone>= game_state.cards_in_zones[dst_zone_id].length)){ 
      game_state.cards_in_zones[dst_zone_id]  = game_state.cards_in_zones[dst_zone_id].concat(cards_removed);
    } else {      
      game_state.cards_in_zones[dst_zone_id].splice(dst_pos_in_zone, 0, ...cards_removed);
    }

    //console.log(game_state.cards_in_zones);
    io.sockets.emit('gameStateSync', game_state.last_events, game_state.cards_in_zones, null);
  });  

  socket.on('uiElementTextSync', function(element_name, text){
    console.log('uiElementTextSync', element_name, text); 
    game_state.ui_element_sync_cache.set(element_name, text);
    socket.broadcast.emit('uiElementTextSync', element_name, text); 
  });

  socket.on('requestUIElementTextCache', function(){
    for (let [element_name, text] of game_state.ui_element_sync_cache){
      socket.emit('uiElementTextSync', element_name, text);  
    }
  });
  
  socket.on('requestGameStatus', function(){
    socket.emit('returnGameStatus', game_state.status, Array(...game_state.socket_id_to_player_info.values()), can_join_game());    
  });
  socket.on('resetGame', function () {  
    console.log('reset Game');
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