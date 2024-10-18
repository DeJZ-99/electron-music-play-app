import { select, selectAll, createMessage, initElement, css, networkStatus, createDialog } from './engine.js';
import { searchEngine } from './request.js';
import { handleURL } from './data.js';
import { back_button, del_button, ref_button, location_button, title } from './content.js';

const menu_buttons = selectAll('.menu-box .iconfont');
const menu_names = ['热门音乐', '音乐排行榜', '下载列表', '本地音乐', '系统设置'];
let menu_index = 0;

menu_buttons.forEach((item, index) => {
    item.addEventListener('mouseover', () => createMessage(item, menu_names[index]));
    item.addEventListener('mouseout', () => select('.message').remove());
    item.addEventListener('click', () => {
        initElement();
        select('.active').classList.remove('active');
        item.classList.add('active')
        title.innerHTML = menu_names[index];
        const option = item.getAttribute('data-menu');

        const option_func = {
            hot: () => {
                if (!networkStatus()) return createDialog('网络错误，加载失败！');
                searchEngine(`${handleURL("", 'hot')}`, 'hot')
            },
            rank: () => {
                if (!networkStatus()) return createDialog('网络错误，加载失败！');
                searchEngine(`${handleURL("", 'rank')}`, 'rank')
            }
        }
        option_func[option]?.();

        /**
         * 隐藏或显示页面（元素）
         * @param {Object} el 要隐藏或显示的页面（元素）
         * @param {string} type 菜单选项
         * @param {typeof el[Symbol.iterator] !== 'function'} 判断 el 是否为不可迭代对象
         */
        const _hideshow = (el, type) => {
            if (typeof el[Symbol.iterator] !== 'function') css(el, { "display": option === type ? "block" : "none" });
            else el.forEach(item => css(item, { "display": option === type ? "block" : "none" }));
        }

        css(back_button, { "display": "none" })
        _hideshow(del_button, 'download');
        _hideshow(ref_button, 'local');
        _hideshow(location_button, 'local');
        _hideshow(select('.set-part'), 'setting');
        _hideshow(selectAll('.download-page'), 'download');
        _hideshow(selectAll('.local-page'), 'local');

        menu_index = index;
    });
})

const init = () => select('.menu-box .iconfont[data-menu="hot"]').click();
export { init, menu_index, menu_buttons }