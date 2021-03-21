import Phaser from './phaser.js';
import {Game} from './game.js';
import {GameRoom} from './game_room.js';

export default new Phaser.Game({
	parent: 'gamediv',
	type: Phaser.AUTO,

	disableContextMenu: true,
    dom: {
        createContainer: true
    },
    scale: {
        parent: 'gamediv',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        mode: Phaser.Scale.FIT,
        width: 600,
        height: 800
    },
    resolution: window.devicePixelRatio,
	scene: [GameRoom, Game],
});

