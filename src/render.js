import { init as header } from './js/header.js';
import { init as aside } from './js/aside.js';
import { init as content } from './js/content.js';
import { init as footer } from './js/footer.js';
import { networkStatus } from './js/engine.js';

header();
aside();
content();
footer();

/**
 * 禁止选中文字
 * @param {Event} event - 事件对象
 */
document.addEventListener('selectstart', (event) => event.preventDefault());

/**
 * 网络状态提示
 */
window.addEventListener('offline', () => {
    if (!networkStatus()) window.electronAPI.send("network:status", false);
});
window.addEventListener('online', () => {
    if (networkStatus()) window.electronAPI.send("network:status", true);
});