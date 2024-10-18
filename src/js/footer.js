import {
    select,
    handleThumb,
    handleMusicTime,
    css,
    read,
    save,
    createDialog,
    selectAll,
    hideShowButton,
    toggleMusic,
    createPlayList,
    createMessage,
    createCheckEffect,
    id
} from './engine.js';
import { draw } from './canvas.js';

const audio = select('audio');
const audio_progress = select('.music-progress');
const audio_thumb = select('.music-progress .thumb');
let [totall_time, value_id] = [0, 0];  //记录当前播放的音乐的总时长和当前播放的音乐的歌词的id
const img_button = select('.music-ctrl .music-info img');
const lyric_button = select('.music-ctrl .music-info .iconfont');
const play_ctrls = selectAll('.play-ctrl .iconfont');
const voice_progress = select('.voice-progress');
const voice_thumb = select('.voice-progress .thumb');
const voice_ctrls = selectAll('.voice-ctrl .iconfont');
const mode_ctrls = selectAll('.mode-ctrl .iconfont');
const mode_names = ['列表循环', '单曲循环']
const play_list_ctrl = select('.play-list-ctrl');
const play_list = select('.play-list');
let analyser, dataArray, buffer_len, ISINIT = false; //Web Audio API 相关的变量
let play_offset = null; //正在播放的音乐相对播放列表的偏移量

audio_progress.addEventListener('click', (event) => handleThumb('audio', audio_progress, event.x, audio_thumb));

audio.addEventListener('timeupdate', () => {
    const { currentTime, duration } = audio;
    if (totall_time !== duration) {
        handleMusicTime(duration, 'total');
        totall_time = duration;
    }
    handleMusicTime(currentTime, 'now');
    css(audio_thumb, { "width": `${currentTime / duration * 100}%` });
    if (currentTime === duration) {
        toggleMusic('next');
        selectAll('.data-part .active').forEach(item => item.classList.remove('active'));
    };

    const time = id(`${Math.floor(currentTime)}`);
    if (time) {
        let value = time.id;
        if (value === value_id) return;
        value_id = value;
        select('p.active').classList.remove('active');
        time.classList.add('active');
        const height = select('p.active').clientHeight;
        const index = Object.keys(read('lyrics')).indexOf(value_id);
        if (value_id > 0) save({ name: 'lyric', value: read('lyrics')[value_id] });
        if (index === 0) css(select('.lyc-box'), { "top": 0 });
        if (index > 4) css(select('.lyc-box'), { "top": `-${(index - 4) * parseFloat(height)}px` });
    }
})

audio.addEventListener('play', () => {
    const local_list = selectAll('.local-list');
    const play_list = selectAll('.list-item');
    const index = read('play_index');
    createCheckEffect(local_list[index]);
    createCheckEffect(play_list[index]);
    play_offset = select('.local-list.active').offsetTop;

    if (ISINIT) return;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(audio);
    analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    buffer_len = analyser.frequencyBinCount * 44100 / audioContext.sampleRate | 0;
    dataArray = new Uint8Array(buffer_len);
    ISINIT = true;
    draw();
})

img_button.addEventListener("click", () => {
    const { top, height } = select('.groove-lyric').getBoundingClientRect();
    css(select('.groove-lyric'), { 'top': top < 0 ? 0 : `-${height}px` })
})

lyric_button.addEventListener('click', () => {
    if (read('lyric_status') === 'open') return createDialog('歌词窗口已经打开！');
    window.electronAPI.send('lyric:show');
    save({ name: "lyric_status", value: 'open' });
})

play_ctrls.forEach((item, index) => {
    item.addEventListener('click', () => {
        const type = item.getAttribute('data-music');
        const type_func = {
            prev: () => { toggleMusic('prev') },
            play: () => {
                hideShowButton(item, index, 1);
                if (audio.src !== '') audio.play();
                css(select('.groove-lyric img'), { "animation-play-state": 'running' });
            },
            pause: () => {
                hideShowButton(item, index, -1);
                audio.pause();
                css(select('.groove-lyric img'), { "animation-play-state": 'paused' });
                _save();
            },
            next: () => { toggleMusic('next') }
        }
        type_func[type]();
    })
})

voice_progress.addEventListener('click', (event) => handleThumb('voice', voice_progress, event.x, voice_thumb));

voice_ctrls.forEach((item, index) => {
    item.addEventListener('click', () => {
        const type = item.getAttribute('data-voice');

        const _mute = (offset, value) => {
            hideShowButton(item, index, offset);
            audio.volume = value;
            css(voice_thumb, { "width": `${value * 100}%` })
        }

        const type_func = {
            mute: () => {
                _mute(1, 0);
            },
            unmute: () => {
                _mute(-1, read('voice_progress'));
            }
        }
        type_func[type]();
    })
})

mode_ctrls.forEach((item, index) => {
    item.addEventListener('mouseover', () => createMessage(item, mode_names[index], 'words'));
    item.addEventListener('mouseout', () => select('.message').remove());

    item.addEventListener('click', () => {
        const type = item.getAttribute('data-mode');

        const _loop = (offset, boolean) => {
            hideShowButton(item, index, offset);
            audio.loop = boolean;
        }

        const type_func = {
            order: () => _loop(1, true),
            loop: () => _loop(-1, false)
        }
        type_func[type]();
    })
})

play_list_ctrl.addEventListener('click', () => {
    const { top, height } = play_list.getBoundingClientRect();
    css(play_list, { 'top': top < 0 ? 0 : `-${height + 3}px` })
})

window.addEventListener('beforeunload', () => _save());

/**
 * 保存播放的音乐信息
 */
function _save() {
    save([
        { name: 'songname', value: select('.music-ctrl .music-info .songname').innerHTML },
        { name: 'singer', value: select('.music-ctrl .music-info .singer').innerHTML },
        { name: 'auido_url', value: audio.src }
    ]);
}

const init = () => {
    if (read('voice_progress') !== null) {
        audio.volume = read('voice_progress');
        css(voice_thumb, { "width": `${read('voice_progress') * 100}%` });
    }
    if (read('music_info') !== null) createPlayList(read('music_info'));
    if (read('auido_url') !== null) {
        select('.music-ctrl .music-info .singer').innerHTML = read('singer');
        select('.music-ctrl .music-info .songname').innerHTML = read('songname');
        audio.src = read('auido_url');
    }
}

export { init, ISINIT, analyser, dataArray, buffer_len, play_list, play_offset }