const { app, BrowserWindow, ipcMain, nativeTheme, dialog, shell, Menu, Tray, Notification } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

app.setAppUserModelId("Ginkgo Music");
// 公用变量
let [mainWindow, noticeWindow, lyricWindow, loadingWindow] = [null, null, null, null];

// 操作方法
// header 主题获取
ipcMain.handle("theme:get", () => {
    return {
        color: nativeTheme.shouldUseDarkColors,
        mode: nativeTheme.themeSource
    }
});

// header 主题设置
ipcMain.handle("theme:set", (event, options) => {
    const theme = {
        dark: () => nativeTheme.themeSource = "dark",
        light: () => nativeTheme.themeSource = "light",
        system: () => nativeTheme.themeSource = "system"
    }
    return theme[options]?.();
})
// header 窗口控制
ipcMain.on("window:ctrl", (event, options) => {
    const type = {
        min: () => mainWindow.minimize(),
        max: () => mainWindow.maximize(),
        restore: () => mainWindow.restore(),
        close: () => mainWindow.close()
    }
    type[options]?.();
})

// main 获取音乐文件列表
ipcMain.handle("get:music", (event, url) => {
    let musicList = readFile(url);
    return musicList;
});
// main 选择路径
ipcMain.handle("get:url", () => {
    return dialog.showOpenDialogSync({
        properties: ["openDirectory"],
        title: "选择路径",
        buttonLabel: "确定"
    });
});
// main 移动文件
ipcMain.handle("move:file", (event, options) => {
    const { src, dest } = options;
    let [musicList, status] = [[], false];
    musicList = readFile(src);
    if (musicList.length === 0) return false;
    musicList.forEach((item, index) => {
        fs.renameSync(path.join(`${src}/${item}`), path.join(`${dest}/${item}`));
        if (index == musicList.length - 1) status = true;
    });
    return status;
});
// main 打开外部链接
ipcMain.on('open:link', (event, url) => shell.openExternal(url));
// main 打开、关闭日志窗口
ipcMain.on('open:notice', () => {
    noticeWindow = createWindow(noticeWindow, {
        width: 400,
        height: 300,
        parent: mainWindow,
        modal: true,
    }, "./page/notice.html");
});
ipcMain.on('close:notice', () => {
    noticeWindow.close();
    noticeWindow.destroy();
});
// footer 歌词显示与隐藏
ipcMain.on('lyric:show', () => {
    lyricWindow = createWindow(lyricWindow, {
        width: 600,
        height: 35,
        show: true,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, "./preload.js"),
            devTools: false
        }
    }, "./page/lyrics.html");
});
ipcMain.on('lyric:close', () => {
    lyricWindow.close();
    lyricWindow.destroy();
});
// 网络状态提示
ipcMain.on('network:status', (event, status) => {
    if (status) createNotification({ body: "网络连接成功！" });
    else createNotification({ body: "网络已走丢，避免影响您的良好体验，请检查网络设置。" });
});


// 应用进程
app.on("ready", () => {
    mainWindow = createWindow(mainWindow, {}, "index.html");
    mainWindow.on("close", (event) => {
        event.preventDefault();
        mainWindow.hide();
        createNotification({ body: "程序已最小化到托盘" });
    });
    loadingWindow = createWindow(loadingWindow, {
        width: 400,
        height: 300,
        show: true,
        transparent: true
    }, "./page/loading.html");
    createTray();
    showHideWindow(loadingWindow, mainWindow, 1500);

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// 公用函数
function createWindow(windowName, options, url) {
    const option = {
        width: 800,
        height: 600,
        frame: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            devTool: true
        }
    };
    options = Object.assign(option, options);
    windowName = new BrowserWindow(options);
    windowName.loadFile(path.join(__dirname, url));

    return windowName;
}

/**
 * 读取文件
 * @param {string} url - 文件路径
 * @return {Array} 文件列表
 */
function readFile(url) {
    return fs.readdirSync(path.join(`${url}`)).filter(item => item.endsWith('.mp3') || item.endsWith('.flac'));
}

/**
 * 创建托盘
 * @return {Object} 创建的 Tray 实例
 */
function createTray() {
    const menu = Menu.buildFromTemplate([
        { label: "打开", click: () => { mainWindow.show(); } },
        {
            label: "退出", click: () => {
                mainWindow.destroy();
                app.quit();
            }
        }
    ]);
    const tray = new Tray(path.join(__dirname, "../iconfont/favicon.ico"));
    tray.setToolTip("Ginkgo Music");
    tray.setContextMenu(menu);
}

/**
 * 创建一个通知
 * @param {Object} options - 通知的选项
 * @param {string} options.title - 通知的标题
 * @param {Object} [options] - 自定义的通知选项
 * @param {string} [options.icon] - 通知的图标路径
 */
function createNotification(options) {
    const option = {
        title: "提示",
        ...options,
        icon: path.join(__dirname, "../iconfont/favicon.ico"),
    };
    new Notification(option).show();
}

/**
 * 显示和隐藏窗口
 * @param {Object} hideWindow - 要隐藏的窗口
 * @param {Object} showWindow - 要显示的窗口
 * @param {number} delay - 延迟时间（毫秒）
 */
function showHideWindow(hideWindow, showWindow, delay) {
    setTimeout(() => {
        hideWindow.destroy();
        showWindow.show();
    }, delay);
}