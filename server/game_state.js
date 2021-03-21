//const utils = require('./utils');
import {shuffle} from './utils.js'
import { v4 as uuidv4 } from 'uuid';

/** game state storage and transition */
export class GameState {

    constructor() {
        this.status = "Waiting"; // 'InGame', 'Waiting'
        this.zone_ids = [];
        this.cards_in_zones = {};
        this.card_status = {};
        this.player_list = [];
        /** player list would have the following template
         *  player_uuid: unique player id
         *  player_id: player index on the game layout. Might not be unique
         *  player_name
         *  player_type: 'Unassigned', 'Player', 'Observer'
         *  connection_status: "Connected", 'Disconnected'
         *  socket_id
         */
        this.last_events = {};
        this.ui_element_sync_cache = new Map();
    }

    /** Return number of Active Players in the game */
    n_active_player(){
        return this.player_list.filter(player_info => player_info.player_type==='Player').length
    }

    n_connected_active_player(){
        return this.player_list.filter(player_info =>
            player_info.player_type==='Player' && player_info.connection_status==='Connected'
        ).length
    }

    remove_player(socket_id){
        const index = this.player_list.findIndex(player_info=>player_info.socket_id===socket_id)
        this.player_list.splice(index, 1);
    }

    remove_player_by_uuid(player_uuid){
        const index = this.player_list.findIndex(player_info=>player_info.player_uuid===player_uuid)
        this.player_list.splice(index, 1);
    }
    add_new_player(socket_id){
        this.player_list.push(
            {
                player_id: null,
                player_name: 'Anonymous',
                player_uuid: uuidv4(),
                player_type: 'Unassigned',
                connection_status: 'Connected',
                socket_id: socket_id
            }
        )
    }
    shuffle_player_orders(){
        shuffle(this.player_list);
    }
    get_reduced_player_info(){
        return this.player_list.filter(player_info => player_info.connection_status==='Connected').map(
            player_info => {return {
                player_id: player_info.player_id,
                player_name: player_info.player_name,
                player_type: player_info.player_type,
                connection_status: player_info.connection_status
            }});
    }
    get_player(socket_id){
        return this.player_list.find(player_info => player_info.socket_id===socket_id)
    }
    get_player_id(socket_id) {
        const player_info = this.get_player(socket_id);
        if (player_info === undefined){
            return null
        } else {
            return player_info.player_id
        }
    }
    get_player_by_uuid(player_uuid){
        return this.player_list.find(player_info => player_info.player_uuid===player_uuid)
    }

    check_and_initialize_player(socket_id){
        if (this.get_player(socket_id) === undefined){
            this.add_new_player(socket_id)
        }
    }
    clean_cards_and_events(){
        for (let zone_id of this.zone_ids){
            this.cards_in_zones[zone_id] = [];
        }
        this.card_status = {};
        for (let player_info of this.player_list){
            if ((player_info.player_id !==null) && (player_info.player_id>=0))
            {
                this.last_events[player_info.player_id] = -1;
            }
        }
    }
    reset_state_to_waiting(){
        this.status='Waiting';
        this.ui_element_sync_cache.clear();
        this.zone_ids=[];
        this.cards_in_zones={};
        this.card_status = {};
        this.last_events= {};
        this.player_list = this.player_list.filter(player_info=>player_info.connection_status==='Connected');
        this.player_list.forEach(player_info => {
            player_info.player_type='Unassigned';
            player_info.player_id=null;
        }
        );
    }


    get_next_available_player_id(){
        const all_current_ids = this.player_list.map(player_info=>player_info.player_id);
        let player_id=0;
        while (all_current_ids.includes(player_id)){
            player_id++;
        }
        return player_id
    }

    get_disconnected_player_info(){
        return this.player_list.filter(player_info =>
            player_info.player_type==='Player' && player_info.connection_status==='Disconnected'
        )
    }

}
