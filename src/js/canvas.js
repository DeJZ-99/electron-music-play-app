import { select, id } from './engine.js';
import { ISINIT, analyser, dataArray, buffer_len } from './footer.js';

const canvas = id('canvas');
const ctx = canvas.getContext('2d');
let rads, center_x, center_y, bars, bar_x, bar_y, bar_x_term, bar_y_term, bar_width, bar_height;
let [react_x, react_y, radius, rot, intensity] = [0, 0, 0, 0, 0];

/**
 * 绘制圆形声波图的主函数。
 * 该函数使用 Canvas API 和 Web Audio API 来绘制一个基于音频输入的圆形声波图。
 * @function draw
 */
function draw() {
    if (!ISINIT) return;
    handleCanvas();
    setColor();
    bars = window.innerWidth < 1000 ? 120 : 180;
    analyser.getByteFrequencyData(dataArray);
    for (let i = 0; i < 5; i++) {
        drawBars(i);
    }
    drawCenter();
    requestAnimationFrame(draw);
}

/**
 * 处理画布
 * 该函数设置画布的宽度和高度，并计算中心坐标
 */
function handleCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.89;
    center_x = canvas.width / 4;
    center_y = canvas.height / 2;
}

/**
 * 设置颜色
 * 该函数根据背景颜色设置填充和描边颜色
 */
function setColor() {
    const _color = (r, g, b) => {
        ctx.fillStyle = `rgba(${r},${g},${b},${intensity * 0.00125})`;
        ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
    }
    const color_func = {
        '#1e1e1e': () => _color(255, 255, 161),
        '#efefef': () => _color(0, 91, 153)
    }
    color_func[handleColor()]?.();
}

/**
 * 绘制条形
 * 该函数绘制声波图的每个条形
 * @param {number} i - 条形的索引
 */
function drawBars(i) {
    for (let j = 0; j < bars / 5; j++) {
        rads = Math.PI * 2 / bars;
        bar_height = dataArray[Math.round(buffer_len * (j + bars / 5 + i) / bars)] * 0.5;
        bar_width = 4;
        bar_x = center_x, bar_y = center_y;
        bar_x_term = center_x + Math.cos(rads * (j + bars / 5 * i) + rot) * (radius + bar_height);
        bar_y_term = center_y + Math.sin(rads * (j + bars / 5 * i) + rot) * (radius + bar_height);

        ctx.save();
        ctx.lineWidth = bar_width;

        react_x = 0, react_y = 0;
        intensity = 0;
        ctx.beginPath();
        ctx.moveTo(bar_x, bar_y);
        ctx.lineTo(bar_x_term, bar_y_term);
        ctx.stroke();

        react_x += Math.cos(rads * j + rot) * (radius + bar_height);
        react_y += Math.sin(rads * j + rot) * (radius + bar_height);
        intensity += bar_height * 3;
    }
}

/**
 * 绘制中心
 * 该函数负责绘制中心圆形并处理一些效果，如半径变化和冲击波动画
 */
function drawCenter() {
    radius = window.innerWidth / 8;
    ctx.fillStyle = handleColor();
    ctx.beginPath();
    ctx.arc(center_x, center_y, radius, 0, Math.PI * 2, false);
    ctx.fill();
}

/**
 * 获取初始颜色
 * @returns {string} 颜色
 */
function handleColor() {
    const bg_color = window.getComputedStyle(select('.groove-lyric')).backgroundColor;
    const color = handleRGB(bg_color);
    return color;
}

/**
 * 将颜色转换为十六进制表示
 * @param {string} color - 颜色值，可以是 rgb、rgba 格式
 * @return {string} - 转换后的十六进制颜色值
 */
function handleRGB(color) {
    const type = color.match(/[r][g][b][a]?/) || color.match(/[r][g][b]?/);
    const values = color
        .replace(`${type}`, '')
        .replace("(", '')
        .replace(")", '')
        .split(',')
    const a = parseFloat(values[3] || 1),
        r = Math.floor(a * parseInt(values[0]) + (1 - a) * 255),
        g = Math.floor(a * parseInt(values[1]) + (1 - a) * 255),
        b = Math.floor(a * parseInt(values[2]) + (1 - a) * 255)
    return `#${`0${r.toString(16)}`.slice(-2)}${`0${g.toString(16)}`.slice(-2)}${`0${b.toString(16)}`.slice(-2)}`;
}

export { draw }