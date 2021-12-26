var Client = {};
Client.player_id = null;
Client.player_infos = [];
const uuid = uuidv4();
Client.socket = io.connect(
    {
        query: {
            player_uuid:uuid
        }
    }
);
