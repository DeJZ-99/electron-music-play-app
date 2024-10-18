import { handleURL } from './data.js';
import { searchEngine } from './request.js';

/**
 * 通过window.electronApi.send报告当前网络链接状态
 * @returns {boolean} 网络状态
 */
const networkStatus = () => navigator.onLine ? true : false;

/**
 * 获取元素
 * @param {string} tag - 标签名称
 * @returns {HTMLElement} 元素对象
 */
const select = tag => document.querySelector(tag);

/**
 * 获取元素列表
 * @param {string} tags - 标签名称
 * @returns {NodeListOf<Element>} 元素列表
 */
const selectAll = tags => document.querySelectorAll(tags);

/**
 * 根据id获取元素
 * @param {string} id - id名称
 * @returns {HTMLElement} 元素对象
 */
const id = id => document.getElementById(id);

/**
 * 读取数据
 * @param {string} name 数据的名称
 * @returns {any} 数据的值
 */
const read = name => { return JSON.parse(localStorage.getItem(name)) };

/**
* 存储数据
* @param {Object|Array} object - 要保存的对象或对象数组
*/
function save(object) {
    if (Array.isArray(object)) object.forEach(el => localStorage.setItem(el.name, JSON.stringify(el.value)));
    else localStorage.setItem(object.name, JSON.stringify(object.value));
};

/**
 * 防抖函数
 * @param {Function} callback - 回调函数
 * @param {number} delay - 延迟时间
 * @returns {Function} 防抖后的函数
 */
function debounce(callback, delay) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            callback.apply(this, args);
        }, delay)
    }
}

/**
 * 设置元素样式
 * @param {HTMLElement} tag - 元素对象
 * @param {Object} options - 样式对象
 */
const css = (tag, options) => Object.keys(options).forEach(key => tag.style[key] = options[key]);

/**
 * 初始化页面元素
 */
function initElement() {
    /**
     * 清除指定类名的元素
     * @param {string} class_name - 类名
     */
    const _clear = cls_name => { if (select(`.${cls_name}`)) selectAll(`.${cls_name}`).forEach(el => el.remove()); }

    _clear('online-list');
    _clear('hot-page');
    _clear('rank-page');
}

/**
 * 隐藏或显示按钮
 * @param {HTMLElement} tag - 要隐藏的按钮元素
 * @param {number} index - 要隐藏的按钮索引
 * @param {number} offset - 相对要隐藏的按钮的偏移量
 */
function hideShowButton(tag, index, offset) {
    const tags = tag.parentNode.children;
    css(tags[index], { "display": "none" });
    css(tags[index + offset], { "display": "block" });
}

/**
 * 查找兄弟元素
 * @param {HTMLElement} tag - 要查找兄弟元素的元素
 * @returns {Array} - 兄弟元素的数组
 */
function findSibling(tag) {
    const childs = tag.parentNode.children;
    let siblings = [];
    for (let i = 0; i <= childs.length - 1; i++) {
        if (childs[i] === tag) continue;
        siblings[siblings.length] = childs[i];
    }
    return siblings;
};

/**
 * 处理音乐信息数据
 * @param {Array} data - 包含音乐文件信息的数组
 * @returns {Array} - 处理后的音乐信息数组，包含索引、歌手和歌曲名
 */
function handleMusicInfo(data, type) {
    const type_func = {
        hot: () => data.map((item, index) => {
            const match = item.filename.match(/(.*)-(.*)/);
            return match ? {
                index,
                singer: match[1],
                songname: match[2]
            } : null;
        }),
        rank: () => data.map((item, index) => ({
            index,
            singer: item.author,
            songname: item.name
        })),
        local: () => data.map((item, index) => ({
            index,
            songname: item.replace(/\.mp3$|\.flac$/, '').split('-')[0],
            singer: item.replace(/\.mp3$|\.flac$/, '').split('-')[1]
        }))
    };
    return type_func[type]?.();
}

/**
 * 创建音乐列表
 * @param {Object} data - 音乐数据对象
 * @param {string} type - 列表类型，可选项：'online'、'local'
 */
function createMusicList(data, type) {
    /**
     * 根据条件创建消息弹框
     * @param {HTMLElement} tag 要创建弹框的元素
     */
    const _message = tag => {
        if (tag.scrollWidth > tag.clientWidth) {
            tag.addEventListener('mouseover', () => createMessage(tag, tag.innerHTML, 'music'));
            tag.addEventListener('mouseout', () => select('.message').remove());
        }
    }

    /**
     * 处理字符串，去除换行符和换行符后的内容
     * @param {string} str 要处理的字符串
     */
    const _str = str => str.replace(/\n.*$/, "");

    /**
     * 创建列表模板
     * @param {HTMLElement} tag 要添加的元素
     * @param {Object} data 音乐信息对象
     * @param {string} type - 列表类型，可选项：'online'、'local'
     */
    const _create = (tag, data, type) => {
        tag.setAttribute('class', type === 'online' ? 'online-list' : 'local-list');
        tag.innerHTML = `
            <span class="index">${data.index + 1}</span>
            ${type === 'online' ? '<span class="iconfont">&#xe617;</span>' : ''}
            <span class="songname">${data.songname}</span>
            <span class="singer">${data.singer}</span>
        `;
        select(tag.className === 'online-list' ? '.data-part' : '.local-page').appendChild(tag);
        const type_func = {
            online: () => {
                const [sgn, sgr] = [tag.children[2], tag.children[3]];
                const [songname, singer] = [_str(sgn.innerText), _str(sgr.innerText)];
                const value = `${songname} ${singer}`;
                _message(sgn), _message(sgr);
                tag.children[1].addEventListener('click', (event) => {
                    if (!networkStatus()) return createDialog('网络错误，请求失败！');
                    event.stopPropagation();
                    createDownloadBox({ songname, singer })
                });
                tag.addEventListener('click', () => {
                    if (!networkStatus()) return createDialog('网络错误，请求失败！');
                    createCheckEffect(tag);
                    searchEngine(`${handleURL(value, 'play')}`, 'compare', {
                        songname,
                        singer,
                        type: 'NQ',
                        mode: 'play'
                    });
                });
            },
            local: () => {
                tag.setAttribute('draggable', 'true');
                _message(tag.children[1]), _message(tag.children[2]);
                tag.addEventListener('click', () => playMusic(data, type));
            }
        }
        type_func[type]?.();
    }

    data.forEach(item => {
        const div = document.createElement('div');
        const create = {
            online: () => _create(div, item, type),
            local: () => _create(div, item, type)
        }
        create[type]?.();
    })
}

/**
 * 创建关键词列表
 * @param {string} data - 关键词数据
 */
function createWorksList(data) {
    const box = select('.keywords');
    const div = document.createElement('div');
    div.setAttribute('class', 'item');
    div.innerHTML = data;
    box.appendChild(div);
    div.addEventListener('click', () => {
        import('./request.js').then(({ searchEngine }) => searchEngine(`${handleURL(data, 'search')}`, 'search'));
        box.innerHTML = '';
        css(box, { "height": 0, 'opacity': 0, "display": "none" });
    });

    css(box, { "height": 'auto' });
    const height = select('.keywords').offsetHeight;
    css(box, { "height": 0 });
    box.offsetTop;
    css(box, { "height": `${height}px` });
}

/**
 * 创建消息提示
 * @param {HTMLElement} tag - 要添加消息的元素
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型，可选项：'menu'、'music'、'words'
 */
function createMessage(tag, message, type = 'menu') {
    const div = document.createElement('div');
    div.setAttribute('class', 'message');
    div.innerHTML = message;
    const type_func = {
        music: () => div.classList.add('message-music'),
        words: () => div.classList.add('message-words')
    }
    type_func[type]?.();
    tag.appendChild(div);
}

/**
 * 创建热歌榜页面
 * @param {Object} data - 热歌榜数据对象
 */
function createHotPage(data) {
    const div = document.createElement('div');
    const { url, title, name, desc, songs } = data;
    div.setAttribute('class', 'hot-page');
    div.innerHTML = `
        <img src="${url}" alt="">
        <div>
            <span>${title}：${name}</span>
            <span>${desc}</span>
        </div>`;
    select('.data-part').appendChild(div);
    _create(div, songs, 'hot');
}

/**
 * createHotPage、createRankPage共用的函数
 * @param {HTMLElement} tag - 要添加歌曲列表的元素
 * @param {Array} data - 歌曲数据数组
 * @param {string} type - 类型，可选项：'hot'、'rank'
 */
const _create = (tag, data, type) => {
    tag.addEventListener('click', () => {
        initElement();
        css(select('.title-part span:nth-child(2)'), { "display": "block" });
        createMusicList(handleMusicInfo(data, type), 'online')
    });
}

/**
 * 创建排行榜页面
 * @param {Object} data - 排行榜数据对象
 */
function createRankPage(data) {
    const div = document.createElement('div');
    const { name, update, songs } = data;
    div.setAttribute('class', 'rank-page');
    div.innerHTML = `${name}&nbsp;&nbsp;${update}`;
    select('.data-part').appendChild(div);
    _create(div, songs, 'rank');
}

/**
 * 创建下载选项弹框
 * @param {Object} data - 要下载的数据对象
 */
function createDownloadBox(data) {
    const dialog = document.createElement('dialog');
    const { songname, singer } = data;
    const value = `${songname}${singer}`;
    dialog.setAttribute('class', 'download-options');
    dialog.innerHTML = `
        <div>${songname} - ${singer}</div>
        <div>
            <a href="${handleURL(value, 'play')}">标准音质</a>
            <a href="${handleURL(value, 'playHQ')}">超高音质</a>
            <a href="${handleURL(value, 'playSQ')}">无损音质</a>
        </div>
        <button>取消</button>`;
    document.body.appendChild(dialog);
    dialog.showModal();
    const options = { songname, singer, mode: 'download', type: null, format: null };
    const _close = () => {
        select('dialog').close();
        select('dialog').remove();
    }
    select('dialog button').addEventListener('click', () => _close());
    selectAll('dialog a').forEach((item, index) => {
        if (!networkStatus()) return createDialog('网络错误，请求失败！');
        item.addEventListener('click', (event) => {
            event.preventDefault();
            const set_type = {
                0: () => { options.type = 'NQ'; options.format = 'mp3' },
                1: () => { options.type = 'HQ'; options.format = 'mp3' },
                2: () => { options.type = 'SQ'; options.format = 'flac' }
            }
            set_type[index]?.();
            searchEngine(item.href, 'compare', options);
            _close();
        })
    })
}

/**
 * 创建下载列表
 * @param {Object} data - 下载数据对象
 */
function createDownloadList(data) {
    select('.menu-box span[data-menu="download"]').click();
    const { songname, singer } = data;
    const div = document.createElement('div');
    div.setAttribute('class', 'download-page');
    div.innerHTML = `
        <div class="download-box">
            <span>${songname}-${singer}</span>
            <div class="progress">
                <div class="thumb"></div>
            </div>
            <span class="pg">0%</span>
        </div>`;
    select('.data-part').appendChild(div);
}

/**
 * 创建选中效果
 * @param {HTMLElement} tag - 要添加选中效果的元素
 */
function createCheckEffect(tag) {
    tag.classList.add('active');
    const siblings = findSibling(tag);
    siblings.forEach(item => item.classList.remove('active'));
}

/**
 * 创建提示框
 * @param {string} str - 提示框内容
 */
function createDialog(str) {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('class', 'dialog');
    dialog.innerHTML = `
        <div>${str}</div>
        <button>确定</button>`;
    document.body.appendChild(dialog);
    dialog.showModal();
    select('dialog button').addEventListener('click', () => {
        select('dialog').close();
        select('dialog').remove();
    });
}

/**
 * 播放音乐
 * @param {Object} data - 音乐数据对象, 包含索引、歌曲名和歌手名
 * @param {string} type - 类型，可选项：'online'、'local'
 */
function playMusic(data, type) {
    /**
     * 播放音乐
     * @param {string} url - 音乐文件的 URL
     * @param {string} songname - 歌曲名
     * @param {string} singer - 歌手名
     */
    const _play = (url, songname, singer) => {
        select('audio').src = url;
        select('.music-ctrl .info .songname').innerHTML = songname;
        select('.music-ctrl .info .singer').innerHTML = singer;
        select('.play-ctrl .iconfont[data-music="play"]').click();
        if (!networkStatus()) return handleRquestError('all');
        searchEngine(`${handleURL(`${songname} ${singer}`, 'play')}`, 'compare', {
            songname,
            singer,
            type: 'NQ',
            mode: 'info'
        });
    }

    const type_func = {
        online: () => {
            const { title, singer, music_url } = data;
            _play(music_url, title, singer);
        },
        local: () => {
            const { index, songname, singer } = data;
            _play(`${read('local_url')}/${read('music_list')[index]}`, songname, singer);
            save({ name: 'play_index', value: index });
        }
    }
    type_func[type]?.();
}

/**
 * 切换音乐
 * @param {string} type - 切换类型，可选项：'prev'、'next'
 */
function toggleMusic(type) {
    const _playlocal = offset => {
        let index = read('play_index') + offset;
        offset > 0 ?
            (index = index > read('music_list').length - 1 ? 0 : index) :
            (index = index < 0 ? read('music_list').length - 1 : index);
        const { songname, singer } = read('music_info')[index];
        playMusic({ index, songname, singer }, 'local');
    }
    const type_func = {
        prev: () => _playlocal(-1),
        next: () => _playlocal(1)
    }
    type_func[type]();
}

/**
 * 处理进度条滑块位置
 * @param {string} type - 类型，可选项：'audio'、'voice'
 * @param {HTMLElement} tag_progress - 进度条元素
 * @param {number} clickX - 鼠标点击位置
 * @param {HTMLElement} tag_thumb - 进度条滑块元素
 */
function handleThumb(type, tag_progress, clickX, tag_thumb) {
    const { left, width } = tag_progress.getBoundingClientRect();
    const progress = (clickX - left) / width;
    (type === 'audio') ? select('audio').currentTime = select('audio').duration * progress : select('audio').volume = progress;
    css(tag_thumb, { "width": `${progress * 100}%` });
    if (type === 'voice') save({ name: 'voice_progress', value: progress });
}

/**
 * 处理音乐时间信息
 * @param {number} time - 时间值
 * @param {string} type - 类型，可选项：'total'、'now'
 */
function handleMusicTime(time, type) {
    if (isNaN(time)) return;
    const min = parseInt(time / 60);
    const sec = parseInt(time - min * 60);
    (type === 'total') ?
        (select('.music-time-ratio .total-time').innerHTML = sec < 10 ? `0${min}:0${sec}` : `0${min}:${sec}`) :
        (select('.music-time-ratio .now-time').innerHTML = sec < 10 ? `0${min}:0${sec}` : `0${min}:${sec}`);
}

/**
 * 创建播放列表
 * @param {Array} data - 播放列表数据数组
 */
function createPlayList(data) {
    data.forEach(item => {
        const div = document.createElement('div');
        div.setAttribute('class', 'list-item');
        div.innerHTML = item.songname;
        select('.play-list').appendChild(div);
        div.addEventListener('click', () => playMusic(item, 'local'));
    })
}

/**
 * 创建歌词
 * @param {Object} data - 歌词数据对象
 */
function createLyric(data) {
    select('.scroll-lyc').innerHTML = '';
    const div = document.createElement('div');
    div.setAttribute('class', 'lyc-box');
    select('.scroll-lyc').appendChild(div);
    for (var key in data) {
        const p = document.createElement('p');
        p.setAttribute('id', key);
        p.innerHTML = data[key];
        div.appendChild(p);
    }
    const count = selectAll('.lyc-box p').length;
    selectAll('.lyc-box p')[0].classList.add('active');
    save([
        { name: 'lyric-rows', value: count },
        { name: 'lyric', value: selectAll('.lyc-box p')[0].innerText }
    ]);
}

/**
 * 在指定索引处插入或移动数组元素
 * @param {Array} arr - 要操作的数组
 * @param {number} index - 原始索引，即要移动的元素的当前位置
 * @param {number} tindex - 目标索引，即要将元素移动到的位置
 * @returns {Array} - 操作后的数组
 */
function handleSort(arr, index, tindex) {
    if (index > tindex) {
        arr.splice(tindex, 0, arr[index]);
        arr.splice(index + 1, 1)
    }
    else {
        arr.splice(tindex + 1, 0, arr[index]);
        arr.splice(index, 1)
    }
    return arr;
}

/**
 * 创建一个上下文菜单
 * @param {Object[]} options - 菜单选项的数组
 * @param {number} options[].label - 菜单选项的标签
 * @param {string} options[].type - 菜单选项的类型（'download', 'refresh', 'play'）
 * @param {number} x - 菜单的水平位置
 * @param {number} y - 菜单的垂直位置
 * @param {HTMLElement} tag - 与菜单选项相关的元素
 */
function createContextMenu(options, x, y, tag) {
    /**
     * 处理菜单点击事件
     * @param {string} type - 点击的菜单类型，可以是 'download'、'refresh' 或 'play'
     * @param {HTMLElement} tag - 被点击的元素，如果类型是 'download' 或 'refresh'，则为 null
     */
    const menu_click = (type, tag = null) => {
        switch (type) {
            case 'cancel': div.remove(); break;
            case 'download': tag.children[1].click(); break;
            case 'refresh': select(".title-part span[data-btn='refresh']").click(); break;
            default: tag.click(); break;
        }
        div.remove();
    }

    const div = document.createElement('div');
    div.setAttribute('class', 'contextmenu-box');
    select('body').appendChild(div);
    css(div, { "left": `${x}px`, "top": `${y}px` });
    options.forEach(item => {
        const menu_item = document.createElement('div');
        menu_item.innerHTML = item.label;
        div.appendChild(menu_item);
        menu_item.addEventListener('click', () => {
            switch (item.type) {
                case 'cancel': menu_click('cancel', tag); break;
                case 'download': menu_click('download', tag); break;
                case 'refresh': menu_click('refresh'); break;
                default: menu_click('play', tag); break;
            }
        });
    });
}

/**
 * 处理请求错误，无歌词、海报信息等情况
 * @param {string} type - 错误类型，可选项：'all'、'part'
 */
function handleRquestError(type) {
    if (type === 'all') {
        select('.groove img').src = "../iconfont/music-playing.png";
        select('.music-ctrl img').src = "../iconfont/music.png";
    }
    select('.scroll-lyc').innerText = "没有歌词、海报信息！";
    save({ name: 'lyric', value: "Hello! This`s desktop lyrics." });
}

export {
    networkStatus,
    select,
    selectAll,
    id,
    read,
    save,
    css,
    debounce,
    initElement,
    toggleMusic,
    playMusic,
    hideShowButton,
    handleMusicInfo,
    handleThumb,
    handleMusicTime,
    createMusicList,
    createWorksList,
    createMessage,
    createHotPage,
    createRankPage,
    createDownloadList,
    createCheckEffect,
    createDialog,
    createPlayList,
    createLyric,
    handleSort,
    createContextMenu,
    handleRquestError
};