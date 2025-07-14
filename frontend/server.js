/**
 * 简单的HTTP服务器用于提供前端文件
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

// 提供静态文件
app.use(express.static(__dirname));

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🌐 前端服务器已启动`);
    console.log(`📍 访问地址: http://localhost:${PORT}`);
    console.log(`🎯 确保后端API服务器正在运行: http://localhost:3000`);
    console.log('\n🚀 打开浏览器访问前端界面进行测试！');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 前端服务器已关闭');
    process.exit(0);
});