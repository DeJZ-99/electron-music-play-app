import { handleURL } from './data.js';
import {
    select,
    selectAll,
    css,
    save,
    initElement,
    createMusicList,
    createWorksList,
    createHotPage,
    createRankPage,
    createDownloadList,
    createDialog,
    playMusic,
    createLyric,
    handleRquestError
} from './engine.js';

/**
 * 搜索引擎
 * @param {string} url - 搜索地址
 * @param {string} type - 搜索类型
 * @param {Object} options - 搜索选项
 */
function searchEngine(url, type, options = null) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.send();
    xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            const data = JSON.parse(xhr.response);
            const engine = {
                search: () => handleMusic(data),
                keywords: () => handleWords(data),
                hot: () => handleHot(data),
                rank: () => handleRank(data),
                compare: () => handleResult(data, options),
                download: () => handleDownload(data, options),
                play: () => playMusic(data, 'online'),
                info: () => handleInfo(data)
            }
            engine[type]?.();
        }
    })
};

/**
 * 处理音乐数据
 * @param {Object} data - 音乐数据对象
 */
function handleMusic(data) {
    select('.title-part .title').innerHTML = "搜索结果";
    const box = select('.search-part input');
    box.value = '';
    box.blur();
    const info = data.data.lists;
    initElement();
    selectAll('.local-page').forEach(item => css(item, { "display": "none" }));
    selectAll('.title-part span').forEach(item => css(item, { "display": "none" }));
    select('.menu-box .active').classList.remove('active');
    const result = info.map((item, index) => {
        return {
            index,
            songname: item.SongName,
            singer: item.SingerName
        }
    })
    createMusicList(result, 'online');
}

/**
 * 处理关键词数据
 * @param {Object} data - 关键词数据对象
 */
function handleWords(data) {
    const info = data.data.info;
    select('.keywords').innerHTML = '';
    info.forEach(item => createWorksList(item.filename));
}

/**
 * 处理热门音乐数据
 * @param {Object} data - 热门音乐数据对象
 */
function handleHot(data) {
    const info = data.data.list;
    info.forEach(item => {
        createHotPage({
            url: item.imgurl,
            title: item.specialname,
            name: item.nickname,
            desc: item.intro,
            songs: item.songs
        });
    });
}

/**
 * 处理排行榜数据
 * @param {Object} data - 排行榜数据对象
 */
function handleRank(data) {
    const info = data.rank.list;
    info.forEach((item, index) => {
        createRankPage({
            index,
            name: item.rankname,
            update: item.update_frequency,
            songs: item.songinfo
        });
    });
}

/**
 * 处理比较结果数据
 * @param {Object} data - 比较结果数据对象
 * @param {Object} options - 配置选项对象
 */
function handleResult(data, options) {
    const _str = str => str.trim().replace(/\s/g, '');
    if (data === null) return createDialog('本音乐库内没有该歌曲！');
    const { songname, singer, type, mode } = options;
    let [info, i] = [[], null];
    data.data.forEach(item => {
        info.push({
            songname: item.title || item.song_title,
            singer: item.singer || item.song_singer
        })
    })
    info.forEach((item, index) => {
        if (Object.is(_str(item.songname), _str(songname)) && Object.is(_str(item.singer), _str(singer))) {
            i = index + 1;
            return true;
        }
    })
    if (i === null) {
        if (mode === 'info') return handleRquestError('all');
        return createDialog('该歌曲没有版权！');
    }
    const type_func = {
        NQ: () => searchEngine(`${handleURL(`${songname} ${singer}`, 'play')}${i}`, mode, options),
        HQ: () => searchEngine(`${handleURL(`${songname} ${singer}`, 'playHQ')}${i}`, mode, options),
        SQ: () => searchEngine(`${handleURL(`${songname} ${singer}`, 'playSQ')}${i}`, mode, options)
    }
    type_func[type]?.();
}

/**
 * 处理下载数据
 * @param {Object} data - 下载数据对象
 * @param {Object} options - 配置选项对象
 */
function handleDownload(data, options) {
    createDownloadList(options);
    const url = data.music_url || data.data.music_url;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            const index = selectAll('.download-box .thumb').length - 1;
            selectAll('.download-box .pg')[index].innerHTML = `${percent}%`;
            css(selectAll('.download-box .thumb')[index], { "width": `${percent}%` });
        }
    });

    xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
            let blobUrl = window.URL.createObjectURL(xhr.response);
            const link = document.createElement('a');
            document.body.appendChild(link);
            css(link, { "display": 'none' });
            link.href = blobUrl;
            link.download = `${options.songname} - ${options.singer}.${options.format}`;
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        }
    });
    xhr.send();
}

function handleInfo(data) {
    select('.music-ctrl img').src = data.cover;
    select('.groove img').src = data.cover;
    const lyric = data.lyrics;
    if (lyric === '') return handleRquestError('part');
    const once_apart = lyric.match(/\[offset:(-?\d+)\]/g) || null;
    const twice_apart = lyric.match(/\[by:[^\]]*\]/g) || null;
    const retain_part = lyric.split(once_apart || twice_apart)[1];
    const time_part = retain_part.match(/\[\d{2}:\d{2}\.\d{2}\]/g) || [];
    const handle_time = time_part.map(item => {
        const [minutes, seconds] = item.match(/\d{2}:\d{2}\.\d{2}/)[0].split(':');
        const milliseconds = seconds.split('.')[1];
        return Math.floor(Number(minutes) * 60 + Number(seconds) + Number(milliseconds) / 100);
    });
    const lyric_part = retain_part.replace(/\[\d{2}:\d{2}\.\d{2}\]/g, '').split('\r\n');
    const lyric_arr = Object.values(lyric_part);
    lyric_arr.forEach((item, index) => { if (item === '') lyric_arr.splice(index, 1); });
    const lyric_object = {};
    handle_time.forEach((time, index) => lyric_object[time] = lyric_arr[index]);
    Object.keys(lyric_object).forEach(key => { if (lyric_object[key] === '') delete lyric_object[key]; });
    createLyric(lyric_object);
    save({ name: 'lyrics', value: lyric_object });
}

export { searchEngine };