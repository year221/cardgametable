//var express = require('express');
import express from 'express';
import * as http from 'http';
import {Server}  from 'socket.io'
var app = express();
var server = http.createServer(app);
const options = { /* ... */ };
const io = new Server(server, options);
// console.log(server)
// var io = require('socket.io').listen(server);
//const utils = require('./utils');
import * as utils from './utils.js'
//const gs = require('./game_state.js')
import {GameState} from './game_state.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

const game_state = new GameState();
// game_state = {
//   status: "Waiting",
//   zone_ids: [],
//   cards_in_zones: {},
//   card_status: {},
//   socket_id_to_player_id: new Map(),
//   socket_id_to_player_info: new Map(),
//   last_events: {},
//   n_active_player:0,
//   ui_element_sync_cache: new Map()
// };


// function get_currently_connected_active_players(){
//   const all_player_id = Array(...game_state.socket_id_to_player_id.values())
//   const n_active_player = all_player_id.filter(player_id => Math.floor(player_id)>=0).length;
//   return n_active_player
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
  return game_state.n_connected_active_player() < game_state.n_active_player()
  //const connected_active_players = get_currently_connected_active_players();
  //return (connected_active_players < game_state.n_active_player);
}
// function check_player_info(socket_id){
//     if (!game_state.socket_id_to_player_info.has(socket_id)){
//       game_state.socket_id_to_player_info.set(socket_id, {player_name:null, player_type:'Unassigned', player_id:''});
//     }
// }
function reset_state_to_waiting(){
  game_state.reset_state_to_waiting();
  // game_state.zone_ids=[];
  // game_state.cards_in_zones={};
  // game_state.card_status = {};
  // game_state.last_events={};
  // game_state.socket_id_to_player_id.clear();
  // //game_state.socket_id_to_player_info.clear();
  // for (let [socket_id, player_info] of game_state.socket_id_to_player_info){
  //   player_info.player_type = 'Unassigned';
  //   player_info.player_id = '';
  // }
  // game_state.status='Waiting';
  // game_state.n_active_player=0;
  // game_state.ui_element_sync_cache.clear();
}


io.on('connection', function (socket) {
  console.log('a user connected', socket.id, 'player_id', socket.handshake.query.player_uuid);
  game_state.check_and_initialize_player(socket.id, socket.handshake.query.player_uuid);
  io.sockets.emit('playerInfo', game_state.get_reduced_player_info());
  console.log(game_state)
  //check_player_info(socket.id);
  //game_state.socket_id_to_player_info.set(socket.id, {player_name:null, player_type:'Unassigned', player_id:''});

  // Game Room functionality
  socket.on('updatePlayerName', function(player_name){
    game_state.get_player(socket.id).player_name = player_name;
    //game_state.socket_id_to_player_info.get(socket.id).player_name =player_name;
    //player_info.player_name = player_name;
    io.sockets.emit('playerInfo', game_state.get_reduced_player_info());
  });

  socket.on('getMyPlayerName', function(player_name){
    //check_player_info(socket.id);
    //game_state.check_and_initialize_player(socket.id);
    //socket.emit('returnPlayerName',game_state.socket_id_to_player_info.get(socket.id).player_name);
    socket.emit('returnPlayerName',game_state.get_player(socket.id).player_name);
  });

  socket.on('observeGame', function(){
    //check_player_info(socket.id);
    //game_state.check_and_initialize_player(socket.id);
    game_state.get_player(socket.id).player_type ='Observer';
    io.sockets.emit('playerInfo', game_state.get_reduced_player_info());
    if (game_state.status=='InGame'){
        //game_state.socket_id_to_player_id.set(socket.id, '-1');
        //game_state.socket_id_to_player_info.get(socket.id).player_id = '-1';
      game_state.get_player(socket.id).player_id = -1;
        socket.broadcast.emit('returnGameStatus',
            game_state.status, game_state.get_reduced_player_info(), can_join_game());
        socket.emit('playerIDAssigned', -1);
        socket.emit('startGameFromGameRoom');
    }
  });

  socket.on('joinGame', function(){

    //const connected_active_players = get_currently_connected_active_players();
    if (game_state.status=='Waiting'){
      //game_state.check_and_initialize_player(socket.id);
      game_state.get_player(socket.id).player_type ='Player';
      //game_state.socket_id_to_player_info.get(socket.id).player_type ='Player';
      io.sockets.emit('playerInfo', game_state.get_reduced_player_info());
    } else {
      if (can_join_game()){
        // make the current client replace the disconnected player
        const available_player_info = game_state.get_disconnected_player_info();
        if (available_player_info.length>0){
          const current_socket_player = game_state.get_player(socket.id);
          //const player_info = game_state.get_player_by_uuid(available_player_info[0].player_uuid);
          current_socket_player.player_type = 'Player';
          current_socket_player.player_id = available_player_info[0].player_id;
          game_state.remove_player_by_uuid(available_player_info[0].player_uuid);
          //player_info.socket_id = socket.id;
          //player_info.connection_status = 'Connected';
          //player_info.player_name = current_socket_player.player_name
          console.log(game_state)
          socket.broadcast.emit('returnGameStatus',
              game_state.status, game_state.get_reduced_player_info(), can_join_game());
          socket.emit('playerIDAssigned', current_socket_player.player_id);
          socket.emit('startGameFromGameRoom');
          socket.broadcast.emit('playerInfo', game_state.get_reduced_player_info());
        }
        // provide a ID and allow to join
        // const player_id = get_available_player_id();
        // game_state.socket_id_to_player_id.set(socket.id, player_id);
        // game_state.socket_id_to_player_info.get(socket.id).player_type ='Player';
        // game_state.socket_id_to_player_info.get(socket.id).player_id =player_id;

      }
    }
  });

  socket.on('startGame', function(){
    // reset all player id
    if (game_state.status=='Waiting'){
      //game_state.socket_id_to_player_id.clear();
      //console.log('startGame', game_state.socket_id_to_player_info);
      // for (let [socket_id, player_info] of game_state.socket_id_to_player_info){
      //   if (player_info.player_type == 'Player'){
      //     const player_id = get_available_player_id()
      //     game_state.socket_id_to_player_id.set(socket_id, player_id);
      //     game_state.socket_id_to_player_info.get(socket_id).player_id = player_id;
      //   } else if (player_info.player_type == 'Observer'){
      //     game_state.socket_id_to_player_id.set(socket_id, '-1');
      //     game_state.socket_id_to_player_info.get(socket_id).player_id ='-1';
      //   } else if (player_info.player_type == 'Unassigned'){
      //     game_state.socket_id_to_player_id.set(socket_id, '-2');
      //     game_state.socket_id_to_player_info.get(socket_id).player_id ='-2';
      //   }
      // }
      game_state.shuffle_player_orders();
      for (let player_info of game_state.player_list){
        if (player_info.connection_status==='Connected') {
          if (player_info.player_type === 'Player') {
            player_info.player_id = game_state.get_next_available_player_id();
            //game_state.socket_id_to_player_id.set(socket_id, player_id);
            //game_state.socket_id_to_player_info.get(socket_id).player_id = player_id;
          } else if (player_info.player_type === 'Observer') {
            player_info.player_id = -1;
            //game_state.socket_id_to_player_id.set(socket_id, '-1');
            //game_state.socket_id_to_player_info.get(socket_id).player_id ='-1';
          } else if (player_info.player_type === 'Unassigned') {
            player_info.player_id = null;
            //game_state.socket_id_to_player_id.set(socket_id, '-2');
            //game_state.socket_id_to_player_info.get(socket_id).player_id ='-2';
          }
        }
      }
      //console.log('Assign IDs', game_state.socket_id_to_player_id);

      for (let player_info of game_state.player_list) {
        io.to(player_info.socket_id).emit('playerIDAssigned', player_info.player_id);
      }
      // for (let [socket_id, player_id] of game_state.socket_id_to_player_id){
      //   io.to(socket_id).emit('playerIDAssigned', player_id);
      //   //console.log('send ids', socket_id, player_id);
      // }
      console.log('starting game');
      //game_state.n_active_player = get_currently_connected_active_players();
      game_state.status='InGame';//switch to InGame
      io.sockets.emit('startGameFromGameRoom');
    }
  });

  console.log('current_players_map', game_state.socket_id_to_player_id);

  console.log(game_state.n_active_player, game_state.last_events);

  socket.on('disconnect', function (reason) {
    console.log('user disconnected', socket.id, reason);
    game_state.get_player(socket.id).connection_status = 'Disconnected';
    // If the player is not an active player, remove it from the list
    if (game_state.get_player(socket.id).player_type!=='Player'){
      game_state.remove_player(socket.id);
    }
    //const player_id = game_state.socket_id_to_player_id.get(socket.id);
    //game_state.socket_id_to_player_id.delete(socket.id);
    //game_state.socket_id_to_player_info.delete(socket.id);
    //console.log('user disconnected', socket.id, player_id);
    if (game_state.status=='InGame'){
      //const n_player= get_currently_connected_active_players();
      if (game_state.n_connected_active_player()==0){
        reset_state_to_waiting();
        socket.broadcast.emit('returnToGameRoom');
      } else {
        socket.broadcast.emit('playerInfo', game_state.get_reduced_player_info());
      }
    }
    socket.broadcast.emit('returnGameStatus',
        game_state.status,
        game_state.get_reduced_player_info(),
        can_join_game());
  });

  socket.on('exitToGameRoom', function(){
    //console.log("exit_to game room")
    reset_state_to_waiting();
    console.log(game_state);
    console.log("emit exit_to game room")
    io.sockets.emit('returnToGameRoom');
  });
  socket.on('requestLayout', function(){
    socket.emit('resetLayout', null,
        game_state.n_active_player(),
        game_state.get_reduced_player_info());
  });
  socket.on('requestGameSync', function(){
    socket.emit('gameStateSync', game_state.last_events, game_state.cards_in_zones,  game_state.card_status);
  })
  socket.on('cardFlipped', function (event_index, card_id_and_faces)
  {
    //console.log('cardFlipped', game_state.socket_id_to_player_id.get(socket.id), event_index, card_id_and_faces);
    //game_state.last_events[game_state.socket_id_to_player_id.get(socket.id)]=event_index;
    console.log('cardFlipped', game_state.get_player_id(socket.id), event_index, card_id_and_faces);
    game_state.last_events[game_state.get_player_id(socket.id)]=event_index;
    for (const [card_id, face_up] of card_id_and_faces){
      game_state.card_status[card_id]=face_up;
    }
    io.sockets.emit('gameStateSync', game_state.last_events, null, game_state.card_status);
  });

  socket.on('addNewCard', function(event_index, dst_zone_id, card_ids, card_status, strict){
    console.log("addNewCard", event_index, dst_zone_id, card_ids, card_status, strict);
    game_state.last_events[game_state.get_player_id(socket.id)]=event_index;

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

  socket.on('cardMoved', function (event_index, src_zone_id, dst_zone_id, card_ids, dst_pos_in_zone) {
    console.log('cardMoved', game_state.get_player_id(socket.id), event_index, card_ids, src_zone_id, dst_zone_id, dst_pos_in_zone);
    // update card
    game_state.last_events[game_state.get_player_id(socket.id)]=event_index;
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
    socket.emit('returnGameStatus',
        game_state.status,
        game_state.get_reduced_player_info(), can_join_game());
  });
  socket.on('resetGame', function () {
    console.log('reset Game');
    game_state.clean_cards_and_events();
    // for (let zone_id of game_state.zone_ids){
    //   game_state.cards_in_zones[zone_id] = [];
    // }
    // game_state.card_status = {};
    // for (let player_id of game_state.socket_id_to_player_id.values()){
    //   game_state.last_events[player_id]=-1;
    // }
    io.sockets.emit('setGameToInitialStage', game_state.last_events, game_state.cards_in_zones, null);
  });
});



server.listen(3000, function() {
  console.log(`Listening on ${server.address().port}`);
});
