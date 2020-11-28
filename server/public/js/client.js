var Client = {};
Client.player_id = '-2';
Client.player_infos = [];
Client.socket = io.connect();

// Client.socket.on('playerIDAssigned', function (player_id) {
//     console.log('received player ID', player_id);
//     Client.player_id = player_id;            
// });    