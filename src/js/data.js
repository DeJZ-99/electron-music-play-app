/**
 * 歌曲url对象
 * @type {Object} url_object 
 * @property {String} before - 前端部分
 * @property {String} after - 后端部分
 */
const url_object = {
    keywords: {
        before: "",
        after: ""
    },
    search: {
        before: "",
        after: ""
    },
    hot: {
        before: "",
        after: ""
    },
    rank: {
        before: "",
        after: ""
    },
    play: {
        before: "",
        after: ""
    },
    playHQ: {
        before: "",
        after: ""
    },
    playSQ: {
        before: "",
        after: ""
    },
    github: {
        before: "",
        after: ""
    },
    qq: {
        before: "",
        after: ""
    }
}

/**
 * 生成url函数
 * @param {String} value - 需要完善url的内容, 如：歌曲名、歌手名等
 * @param {String} key - url类型（key值）
 * @returns {String} - 返回完整的url
 */
export const handleURL = (value, key) => `${url_object[key].before}${value}${url_object[key].after}`;