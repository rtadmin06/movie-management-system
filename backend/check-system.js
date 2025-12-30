const mongoose = require('mongoose');
const http = require('http');

console.log('='.repeat(60));
console.log('电影管理系统 - 系统诊断工具');
console.log('='.repeat(60));
console.log('');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie_management';
const BACKEND_PORT = process.env.PORT || 3000;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function success(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function error(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function warning(msg) {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
}

function info(msg) {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
}

async function checkMongoDB() {
  console.log('\n【1/4】检查 MongoDB 连接...');
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    success('MongoDB 连接成功');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    info(`找到 ${collections.length} 个集合: ${collectionNames.join(', ')}`);
    
    if (collectionNames.includes('movies')) {
      const movieCount = await db.collection('movies').countDocuments();
      if (movieCount > 0) {
        success(`电影数据库包含 ${movieCount} 部电影`);
      } else {
        error('电影数据库为空！');
        warning('请运行: npm run import');
      }
    } else {
      error('未找到 movies 集合！');
      warning('请运行: npm run import');
    }
    
    if (collectionNames.includes('users')) {
      const userCount = await db.collection('users').countDocuments();
      info(`用户数据库包含 ${userCount} 个用户`);
    }
    
    await mongoose.connection.close();
    return true;
  } catch (err) {
    error('MongoDB 连接失败！');
    error(`错误信息: ${err.message}`);
    warning('请确保 MongoDB 已启动: mongod --dbpath "C:\\data\\db"');
    return false;
  }
}

function checkBackendServer() {
  return new Promise((resolve) => {
    console.log('\n【2/4】检查后端服务...');
    
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: '/api/health',
      method: 'GET',
      timeout: 3000
    };
    
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        success(`后端服务运行正常 (http://localhost:${BACKEND_PORT})`);
        resolve(true);
      } else {
        warning(`后端服务响应异常 (状态码: ${res.statusCode})`);
        resolve(false);
      }
    });
    
    req.on('error', () => {
      error('无法连接到后端服务！');
      warning('请启动后端: cd backend && npm run dev');
      resolve(false);
    });
    
    req.on('timeout', () => {
      error('连接后端服务超时！');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

function checkFrontendServer() {
  return new Promise((resolve) => {
    console.log('\n【3/4】检查前端服务...');
    
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: '/',
      method: 'GET',
      timeout: 3000
    };
    
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        success('前端服务运行正常 (http://localhost:5173)');
        resolve(true);
      } else {
        warning(`前端服务响应异常 (状态码: ${res.statusCode})`);
        resolve(false);
      }
    });
    
    req.on('error', () => {
      error('无法连接到前端服务！');
      warning('请启动前端: cd frontend && npm run dev');
      resolve(false);
    });
    
    req.on('timeout', () => {
      error('连接前端服务超时！');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

function checkEnvironment() {
  console.log('\n【4/4】检查环境配置...');
  
  const nodeVersion = process.version;
  const requiredVersion = 'v16.0.0';
  
  if (nodeVersion >= requiredVersion) {
    success(`Node.js 版本: ${nodeVersion}`);
  } else {
    warning(`Node.js 版本: ${nodeVersion} (建议 >= ${requiredVersion})`);
  }
  
  info(`MongoDB URI: ${MONGODB_URI}`);
  info(`后端端口: ${BACKEND_PORT}`);
  
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    success('.env 配置文件存在');
  } else {
    warning('.env 配置文件不存在（将使用默认配置）');
  }
  
  const imagesDir = path.join(__dirname, '../crawler/data/images');
  if (fs.existsSync(imagesDir)) {
    const imageFiles = fs.readdirSync(imagesDir);
    if (imageFiles.length > 0) {
      success(`找到 ${imageFiles.length} 个电影海报图片`);
    } else {
      warning('电影海报目录为空');
      info('图片将从网络加载，可能较慢');
    }
  } else {
    warning('未找到电影海报目录');
  }
}

async function main() {
  const mongoOk = await checkMongoDB();
  const backendOk = await checkBackendServer();
  const frontendOk = await checkFrontendServer();
  checkEnvironment();
  
  console.log('\n' + '='.repeat(60));
  console.log('诊断结果汇总');
  console.log('='.repeat(60));
  
  console.log(`MongoDB:    ${mongoOk ? colors.green + '✓ 正常' : colors.red + '✗ 异常'}${colors.reset}`);
  console.log(`后端服务:   ${backendOk ? colors.green + '✓ 正常' : colors.red + '✗ 异常'}${colors.reset}`);
  console.log(`前端服务:   ${frontendOk ? colors.green + '✓ 正常' : colors.red + '✗ 异常'}${colors.reset}`);
  
  console.log('\n');
  
  if (mongoOk && backendOk && frontendOk) {
    success('系统运行正常！');
    info('访问: http://localhost:5173');
  } else {
    error('系统存在问题，请根据上述提示修复！');
    console.log('\n常见问题解决：');
    console.log('1. MongoDB 未启动 → 运行: mongod --dbpath "C:\\data\\db"');
    console.log('2. 数据库为空 → 运行: npm run import');
    console.log('3. 后端未启动 → 运行: cd backend && npm run dev');
    console.log('4. 前端未启动 → 运行: cd frontend && npm run dev');
  }
  
  console.log('\n');
  process.exit(mongoOk && backendOk && frontendOk ? 0 : 1);
}

main().catch(err => {
  console.error('诊断过程出错:', err);
  process.exit(1);
});