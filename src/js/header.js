import { select, debounce, css, save, read, selectAll, hideShowButton, networkStatus, createDialog } from './engine.js';
import { searchEngine } from './request.js';
import { handleURL } from './data.js';
import { theme_buttons } from './content.js';

const theme_checkbox = select('.theme-checkbox');
const switch_input = select('.theme-checkbox input');
const search_input = select('.search-part input');
const search_btn = select('.search-part .button');
const words = debounce(searchEngine, 500);
const window_ctrls = selectAll('.win-ctrl-part .iconfont');

theme_checkbox.addEventListener('change', async () => {
    const is_checked = switch_input.checked;
    window.electronAPI.invoke('theme:set', is_checked ? 'light' : 'dark');
    const result = await window.electronAPI.invoke('theme:get');
    save({ name: 'theme', value: result.mode });
    const theme_func = {
        dark: () => theme_buttons[1].click(),
        light: () => theme_buttons[2].click()
    }
    theme_func[result.mode]?.();
});

search_input.addEventListener('keydown', (event) => {
    if (event.code !== 'Enter') return;
    if (!networkStatus()) return createDialog('网络错误，请求失败！');
    const value = search_input.value;
    searchEngine(`${handleURL(value, 'search')}`, 'search');
});

search_btn.addEventListener('click', () => {
    if (!networkStatus()) return createDialog('网络错误，请求失败！');
    const value = search_input.value;
    searchEngine(`${handleURL(value, 'search')}`, 'search');
});

search_input.addEventListener('input', () => {
    if (!networkStatus()) return;
    const value = search_input.value;
    if (value === '') {
        css(select('.keywords'), { "display": 'none', "opacity": '0' });
        select('.keywords').innerHTML = '';
    }
    else {
        words(`${handleURL(value, 'keywords')}`, 'keywords');
        css(select('.keywords'), { "display": 'block', "opacity": '1' });
    }
});

search_input.addEventListener('blur', () => {
    if (search_input.value === '') css(select('.keywords'), { "display": 'none', "opacity": '0' });
    css(select('.keywords'), { "opacity": 0, "z-index": -1 });
});
search_input.addEventListener('focus', () => {
    if (!networkStatus()) return;
    css(select('.keywords'), { "opacity": 1, "z-index": 1 })
});

window_ctrls.forEach((item, index) => {
    item.addEventListener('click', () => {
        const type = item.getAttribute('data-ctrl');
        window.electronAPI.send('window:ctrl', type);
        const type_func = {
            max: () => hideShowButton(item, index, 1),
            restore: () => hideShowButton(item, index, -1),
        }
        type_func[type]?.();
    });
});

const init = async () => {
    if (read('theme')) {
        switch_input.checked = read('theme') === 'light' ? true : false;
        const is_checked = switch_input.checked;
        window.electronAPI.invoke('theme:set', is_checked ? 'light' : 'dark');
    }
    else {
        const result = await window.electronAPI.invoke('theme:get');
        switch_input.checked = result.color ? false : true;
    }
};

export { init, switch_input }