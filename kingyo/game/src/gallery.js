// 見本ページの入口：ページ側のスクリプトから GoldfishGame.mount / GoldfishLogic を使えるようにする
import { mount } from './game/index.js';
import GoldfishLogic from './logic/index.js';
import GoldfishSprites from './art/sprites.js';

window.GoldfishGame = { mount };
window.GoldfishLogic = GoldfishLogic;
window.GoldfishSprites = GoldfishSprites;
window.dispatchEvent(new Event('goldfish-ready'));
