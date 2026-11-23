// 本体ページの入口：#screen に1台ぶん組み立てる
import { mount } from './game/index.js';

mount(document.getElementById('screen'), { main: true });
