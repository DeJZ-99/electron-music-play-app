import {
    select,
    selectAll,
    css,
    save,
    read,
    handleMusicInfo,
    createDialog,
    createMessage,
    createCheckEffect,
    createMusicList,
    createPlayList,
    handleSort,
    createContextMenu
} from './engine.js';
import { menu_index, menu_buttons } from './aside.js';
import { switch_input } from './header.js';
import { handleURL } from './data.js';
import { play_list, play_offset } from './footer.js';

const title = select('.title-part .title');
const button_names = ['返回', '删除', '刷新', '定位'];
const title_buttons = selectAll('.title-part .iconfont');
const back_button = select('.title-part span[data-btn="back"]');
const del_button = select('.title-part span[data-btn="del"]');
const ref_button = select('.title-part span[data-btn="refresh"]');
const location_button = select('.title-part span[data-btn="location"]');
const theme_buttons = selectAll('.set-theme .iconfont');
const theme_name = select('.set-theme span:last-child');
const theme_names = ['跟随系统', '深色模式', '浅色模式'];
const url_buttons = selectAll('.set-url button');
const url_inputs = selectAll('.set-url input');
const move_file = select('.set-url .moving');
const link_buttons = selectAll('.set-link .iconfont');
const look_log = select('.set-log button');
const list_drag = select('.local-page');
const data_part = select('.data-part');
const height = data_part.clientHeight; // 拖拽滚动时滚动的高度
// 拖拽的元素，拖拽的起始索引，拖拽的结算索引，鼠标位置高度，父元素可视高度，拖拽了多少高度
let sourceNode, start_index, end_index, scrollTop, scrollHeight, offsetTop;
const contextmenu_area = select(".data-part");

title_buttons.forEach((item, index) => {
    item.addEventListener('mouseover', () => createMessage(item, button_names[index]));
    item.addEventListener('mouseout', () => select('.message').remove());
});

back_button.addEventListener('click', () => {
    css(back_button, { "display": "none" });
    const index_func = {
        0: () => menu_buttons[menu_index].click(),
        1: () => menu_buttons[menu_index].click()
    }
    index_func[menu_index]?.();
});

del_button.addEventListener('click', () => selectAll('.download-page').forEach(item => item.remove()));

ref_button.addEventListener('click', async () => {
    const url = url_inputs[0].value;
    if (url === null) return createDialog('请先设置路径！');
    const result = await window.electronAPI.invoke('get:music', url);
    const info = handleMusicInfo(result, 'local');
    save([
        { name: 'music_list', value: result },
        { name: 'music_info', value: info }
    ]);
    if (select('.local-list')) selectAll('.local-list').forEach(item => item.remove());
    if (select('.list-item')) selectAll('.list-item').forEach(item => item.remove());
    createMusicList(info, 'local');
    createPlayList(info);
})

location_button.addEventListener('click', () => {
    if (play_offset === null) return;
    data_part.scrollTo({
        top: play_offset - scrollHeight + height * 5,
        behavior: 'smooth'
    });
    play_list.scrollTo({
        top: play_offset - scrollHeight * 1.7,
        behavior: 'smooth'
    });
})

theme_buttons.forEach((item, index) => {
    item.addEventListener('click', () => {
        const theme = item.getAttribute('data-theme');
        window.electronAPI.invoke('theme:set', theme);
        switch_input.checked = theme === 'light' ? true : false;
        createCheckEffect(item);
        theme_name.innerHTML = theme_names[index];
    })
})

url_buttons.forEach((item, index) => {
    item.addEventListener('click', async () => {
        const type = item.getAttribute('data-url');
        if (type === null) return;
        const result = await window.electronAPI.invoke('get:url');
        if (!result) return;
        url_inputs[index].value = result[0];
        save({ name: `${type}_url`, value: result[0] });
    })
});

move_file.addEventListener('click', async () => {
    const dest = url_inputs[0].value;
    const src = url_inputs[1].value;
    if (src === '' || dest === '') return createDialog('请先设置路径！');
    if (src === dest) return createDialog('源路径和目标路径不能相同！');
    const result = await window.electronAPI.invoke('move:file', { dest, src });
    createDialog(result ? '移动成功！' : '没有可移动的文件！');
})

link_buttons.forEach((item, index) => {
    item.addEventListener('click', () => {
        const index_func = {
            0: () => window.electronAPI.send('open:link', handleURL('', 'github')),
            1: () => window.electronAPI.send('open:link', handleURL('', 'qq'))
        }
        index_func[index]?.();
    })
})

look_log.addEventListener('click', () => window.electronAPI.send('open:notice'))

list_drag.addEventListener('dragstart', (event) => {
    setTimeout(() => event.target.classList.add('moving'), 0);
    sourceNode = event.target;
    event.dataTransfer.effectAllowed = 'move';
    start_index = sourceNode.children[0].innerHTML - 1;
});
list_drag.addEventListener('dragenter', (event) => {
    event.preventDefault();
    scrollHeight = data_part.clientHeight;
    if (event.target.className !== 'local-list') return;
    const children = Array.from(list_drag.children);
    const sourceIndex = children.indexOf(sourceNode);
    const targetIndex = children.indexOf(event.target);
    if (sourceIndex < targetIndex) list_drag.insertBefore(sourceNode, event.target.nextElementSibling);
    else list_drag.insertBefore(sourceNode, event.target);
    end_index = targetIndex;
    offsetTop = event.target.offsetTop;
    if (offsetTop > scrollHeight) data_part.scrollTo(0, scrollTop + height);
});
list_drag.addEventListener('dragover', (event) => event.preventDefault());
list_drag.addEventListener('dragend', (event) => {
    event.target.classList.remove('moving');
    const className = event.target.className;
    selectAll(`.${className}`).forEach((item, index) => item.children[0].innerHTML = index + 1);
    const musicListArray = read('music_info');
    const musicNameArray = read('music_list');
    handleSort(musicListArray, start_index, end_index);
    handleSort(musicNameArray, start_index, end_index);
    musicListArray.forEach((item, index) => item.index = index);
    save([
        { name: 'music_info', value: musicListArray },
        { name: 'music_list', value: musicNameArray }
    ]);
    selectAll('.local-list').forEach(item => item.remove());
    selectAll('.list-item').forEach(item => item.remove());
    createMusicList(read('music_info'), 'local');
    createPlayList(read('music_info'));
    data_part.scrollTo(0, scrollTop);
});
data_part.addEventListener('scroll', () => {
    scrollHeight = data_part.clientHeight;
    scrollTop = data_part.scrollTop;
});

contextmenu_area.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    const parent_class_name = event.target.parentNode.getAttribute('class');
    let option;
    if (parent_class_name === 'local-list') option = [{ label: '刷新', type: 'refresh' }];
    if (parent_class_name === 'online-list') option = [{ label: '下载', type: 'download' }];
    let options = [
        { label: '播放', type: 'play' },
        ...option,
        { label: '取消', type: 'cancel' }
    ];
    createContextMenu(options, event.clientX, event.clientY, event.target.parentNode);
})

const init = () => {
    const theme = read('theme');
    const theme_set = {
        system: () => theme_buttons[0].click(),
        dark: () => theme_buttons[1].click(),
        light: () => theme_buttons[2].click(),
    }
    theme_set[theme]?.();
    if (read('local_url') !== null) url_inputs[0].value = read('local_url');
    if (read('move_url') !== null) url_inputs[1].value = read('move_url');
    if (read('music_info') !== null) createMusicList(read('music_info'), 'local');
};

export { init, back_button, del_button, ref_button, title, theme_buttons, location_button } 