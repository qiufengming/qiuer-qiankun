# 子应用Demo
## 初始化项目
用vue脚手架初始化项目：
```bash
vue3 create base
```
初始化项目时的选项：同底座一样

`yarn add element-ui` 安装依赖

修改 App.vue
```vue
<template>
  <div id="app">
    <h2 class="testText">测试文本</h2>
    <el-menu :router="true" :default-active="activeIndex2" class="el-menu-demo" mode="horizontal" @select="handleSelect">
      <el-menu-item index="/">处理中心</el-menu-item>
      <el-menu-item index="/about">订单管理</el-menu-item>
    </el-menu>
    <div>
      <router-view></router-view>
    </div>
  </div>
</template>

<script>

export default {
  name: 'app',
  data() {
    return {
      activeIndex: '1',
      activeIndex2: '1'
    };
  },
  methods: {
    handleSelect(key, keyPath) {
      console.log(key, keyPath);
    }
  }
}
</script>

<style></style>

```

修改项目端口

## 开始接入
在主应用住注册微应用信息 `base/src/qiankun/index.js` 
```js
const apps = [
  /**
   * name: 微应用名称 - 具有唯一性
   * entry: 微应用入口 - 通过该地址加载微应用
   * container: 微应用挂载节点 - 微应用加载完成后将挂载在该节点上
   * activeRule: 微应用触发的路由规则 - 触发路由规则后将加载该微应用
   */
  {
    name: 'vueDemo',
    entry: '//localhost:8082',
    container: '#container',
    activeRule: '/vue-demo',
  },
];
```

### 配置微应用的启动方案
在子应用中的入口文件 `main.js` 中，导出 `qiankun` 主应用所需要的三个生命周期钩子函数
```js
import Vue from 'vue'
import App from './App.vue'
import VueRouter from 'vue-router'
import routes from './router'
import store from './store'
import Element from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

Vue.config.productionTip = false
Vue.use(VueRouter);

Vue.use(Element, {
  size: 'mini', // set element-ui default size
});

if (window.__POWERED_BY_QIANKUN__) {
  // 动态设置 webpack publicPath，防止资源加载出错
  // eslint-disable-next-line no-undef
  __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
}

let instance = null;
let router = null;

/**
 * 渲染函数
 * 两种情况：主应用生命周期钩子中运行 / 微应用单独启动时运行
 */
function render() {
  // 在 render 中创建 VueRouter，可以保证在卸载微应用时，移除 location 事件监听，防止事件污染
  router = new VueRouter({
    // 运行在主应用中时，添加路由命名空间 /vue
    base: window.__POWERED_BY_QIANKUN__ ? '/vue-demo' : '/',
    mode: 'history',
    routes,
  });

  // 挂载应用
  instance = new Vue({
    router,
    render: (h) => h(App),
  }).$mount("#app");
}

// 独立运行时，直接挂载应用
if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

/**
 * bootstrap 只会在微应用初始化的时候调用一次，下次微应用重新进入时会直接调用 mount 钩子，不会再重复触发 bootstrap。
 * 通常我们可以在这里做一些全局变量的初始化，比如不会在 unmount 阶段被销毁的应用级别的缓存等。
 */
export async function bootstrap() {
  console.log("VueApp bootstraped");
}

/**
 * 应用每次进入都会调用 mount 方法，通常我们在这里触发应用的渲染方法
 */
export async function mount(props) {
  console.log("VueApp mount", props);
  render(props);
}

/**
 * 应用每次 切出/卸载 会调用的方法，通常在这里我们会卸载微应用的应用实例
 */
export async function unmount() {
  console.log("VueApp unmount");
  instance.$destroy();
  instance = null;
  router = null;
}
```

报错:
```bash
ERROR in [eslint]
D:\dataGitMy\qiuer-qiankun\vue-demo\src\main.js
  5:8  error  'store' is defined but never used  no-unused-vars

✖ 1 problem (1 error, 0 warnings)
```

方案1：针对全局校验规则
  在 .eslintrc.js 中配置：
  ```js
  rules: {
    'no-unused-vars': 'off',
  }
  ```
方案2：忽略下一行校验，在未使用到定义的变量上一行添加下面这句注释
```js
// eslint-disable-next-line
```
或者
```js
<!-- eslint-disable-next-line -->
```

修改路由配置文件 src/router/index.js
```js
import Home from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/AboutView.vue')
  }
]

export default routes
```

### 加载微应用
微应用的加载有两种方案：
  1、自己启动微应用来访问这个系统
  2、通过主应用来调用微应用。
通过设置变量来区分：
  1、`window.__POWERED_BY_QIANKUN__` 用于判断 window 全局对象中是否有挂载一个属性，如果有这个属性说明我们是采用 qiankun 来加载这个微应用
  2、`function render()` 这个方法中就是在进行判断，哪种场景运行项目。路径 /vue-demo 和 / 代表不同访问方式
  3、 `bootstrap`, `mount`, `unmount` 三个生命周期函数，代表主应用加载这个子应用的时候执行的流程

配置 `webpack` 使 `main.js` 导出的生命周期钩子函数可以被 `qiankun` 识别获取
配置 vue.config.js 
```js
const path = require('path');

module.exports = {
  // transpileDependencies: true,
  devServer: {
    // open: true,
    // 监听端口
    port: 8082,
    // 关闭主机检查，使微应用可以被 fetch
    disableHostCheck: true,
    // 配置跨域请求头，解决开发环境的跨域问题
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    output: {
      // 微应用的包名，这里与主应用中注册的微应用名称一致
      library: 'vueDemo',
      // 将你的 library 暴露为所有的模块定义下都可运行的方式
      libraryTarget: 'umd',
      // 按需加载相关，设置为 webpackJsonp_VueApp 即可
      jsonpFunction: `webpackJsonp_VueApp`,
    },
  },
}
```
把 `libraryTarget` 设置为 `umd` 后， `library` 就暴露为所有的模块定义下都可运行的方式了，主应用就可以获取到微应用的生命周期钩子函数了



然后启动底座，页面切换到子应用Demo，报错
```bash
Uncaught runtime errors:
ERROR
application 'vueDemo' died in status LOADING_SOURCE_CODE: Failed to fetch
TypeError: application 'vueDemo' died in status LOADING_SOURCE_CODE: Failed to fetch
    at importHTML (webpack-internal:///./node_modules/import-html-entry/esm/index.js:296:56)
    at importEntry (webpack-internal:///./node_modules/import-html-entry/esm/index.js:345:12)
    at _callee17$ (webpack-internal:///./node_modules/qiankun/es/loader.js:287:81)
    at tryCatch (webpack-internal:///./node_modules/@babel/runtime/helpers/regeneratorRuntime.js:48:16)
    at Generator.eval (webpack-internal:///./node_modules/@babel/runtime/helpers/regeneratorRuntime.js:136:17)
    at Generator.eval [as next] (webpack-internal:///./node_modules/@babel/runtime/helpers/regeneratorRuntime.js:77:21)
    at asyncGeneratorStep (webpack-internal:///./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js:7:24)
    at _next (webpack-internal:///./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js:26:9)
    at eval (webpack-internal:///./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js:31:7)
    at new Promise (<anonymous>)
```
原因：没有启动子应用

启动子应用报错：
```bash
ERROR  ValidationError: Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
         - configuration.output has an unknown property 'jsonpFunction'. These properties are valid:
           object { amdContainer?, assetModuleFilename?, asyncChunks?, auxiliaryComment?, charset?, chunkFilename?, chunkFormat?, chunkLoadTimeout?, chunkLoading?, chunkLoadingGlobal?, clean?, compareBeforeEmit?, crossOriginLoading?, cssChunkFilename?, cssFilename?, devtoolFallbackModuleFilenameTemplate?, devtoolModuleFilenameTemplate?, devtoolNamespace?, enabledChunkLoadingTypes?, enabledLibraryTypes?, enabledWasmLoadingTypes?, environment?, filename?, globalObject?, hashDigest?, hashDigestLength?, hashFunction?, hashSalt?, hotUpdateChunkFilename?, hotUpdateGlobal?, hotUpdateMainFilename?, ignoreBrowserWarnings?, iife?, importFunctionName?, importMetaName?, library?, libraryExport?, libraryTarget?, module?, path?, pathinfo?, publicPath?, scriptType?, sourceMapFilename?, sourcePrefix?, strictModuleErrorHandling?, strictModuleExceptionHandling?, trustedTypes?, umdNamedDefine?, uniqueName?, wasmLoading?, webassemblyModuleFilename?, workerChunkLoading?, workerPublicPath?, workerWasmLoading? }
           -> Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
           Did you mean output.chunkLoadingGlobal (BREAKING CHANGE since webpack 5)?
ValidationError: Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
 - configuration.output has an unknown property 'jsonpFunction'. These properties are valid:
   object { amdContainer?, assetModuleFilename?, asyncChunks?, auxiliaryComment?, charset?, chunkFilename?, chunkFormat?, chunkLoadTimeout?, chunkLoading?, chunkLoadingGlobal?, clean?, compareBeforeEmit?, crossOriginLoading?, cssChunkFilename?, cssFilename?, devtoolFallbackModuleFilenameTemplate?, devtoolModuleFilenameTemplate?, devtoolNamespace?, enabledChunkLoadingTypes?, enabledLibraryTypes?, enabledWasmLoadingTypes?, environment?, filename?, globalObject?, hashDigest?, hashDigestLength?, hashFunction?, hashSalt?, hotUpdateChunkFilename?, hotUpdateGlobal?, hotUpdateMainFilename?, ignoreBrowserWarnings?, iife?, importFunctionName?, importMetaName?, library?, libraryExport?, libraryTarget?, module?, path?, pathinfo?, publicPath?, scriptType?, sourceMapFilename?, sourcePrefix?, strictModuleErrorHandling?, strictModuleExceptionHandling?, trustedTypes?, umdNamedDefine?, uniqueName?, wasmLoading?, webassemblyModuleFilename?, workerChunkLoading?, workerPublicPath?, workerWasmLoading? }
   -> Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
   Did you mean output.chunkLoadingGlobal (BREAKING CHANGE since webpack 5)?
    at validate (D:\dataGitMy\qiuer-qiankun\vue-demo\node_modules\webpack\node_modules\schema-utils\dist\validate.js:191:11)
    at validateSchema (D:\dataGitMy\qiuer-qiankun\vue-demo\node_modules\webpack\lib\validateSchema.js:78:2)
    at create (D:\dataGitMy\qiuer-qiankun\vue-demo\node_modules\webpack\lib\webpack.js:121:24)
    at webpack (D:\dataGitMy\qiuer-qiankun\vue-demo\node_modules\webpack\lib\webpack.js:169:32)
    at f (D:\dataGitMy\qiuer-qiankun\vue-demo\node_modules\webpack\lib\index.js:73:16)
    at serve (D:\dataGitMy\qiuer-qiankun\vue-demo\node_modules\@vue\cli-service\lib\commands\serve.js:185:22)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
```
原因：
  webpack 5中已将 output.jsonpFunction 更名为 output.chunkLoadingGlobal

报错
```bash
ERROR  ValidationError: Invalid options object. Dev Server has been initialized using an options object that does not match the API schema.
         - options has an unknown property 'disableHostCheck'. These properties are valid:
           object { allowedHosts?, bonjour?, client?, compress?, devMiddleware?, headers?, historyApiFallback?, host?, hot?, http2?, https?, ipc?, liveReload?, magicHtml?, onAfterSetupMiddleware?, onBeforeSetupMiddleware?, onListening?, open?, port?, proxy?, server?, setupExitSignals?, setupMiddlewares?, static?, watchFiles?, webSocketServer? }
ValidationError: Invalid options object. Dev Server has been initialized using an options object that does not match the API schema.
 - options has an unknown property 'disableHostCheck'. These properties are valid:
   object { allowedHosts?, bonjour?, client?, compress?, devMiddleware?, headers?, historyApiFallback?, host?, hot?, http2?, https?, ipc?, liveReload?, magicHtml?, onAfterSetupMiddleware?, onBeforeSetupMiddleware?, onListening?, open?, port?, proxy?, server?, setupExitSignals?, setupMiddlewares?, static?, watchFiles?, webSocketServer? }
    at validate (D:\dataGitMy\qiuer-qiankun\vue-demo\node_modules\schema-utils\dist\validate.js:158:11)
    at new Server (D:\dataGitMy\qiuer-qiankun\vue-demo\node_modules\webpack-dev-server\lib\Server.js:270:5)
    at serve (D:\dataGitMy\qiuer-qiankun\vue-demo\node_modules\@vue\cli-service\lib\commands\serve.js:194:20)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
```
原因:
  在webpack 5 中 disableHostCheck 被遗弃了
  替换为
  historyApiFallback: true,
  allowedHosts: 'all',

报错：
```bash
 ERROR  Failed to compile with 1 error                                                                                                                                     上午11:08:46

[eslint]
D:\dataGitMy\qiuer-qiankun\vue-demo\src\public-path.js
  2:3  error  '__webpack_public_path__' is not defined  no-undef

✖ 1 problem (1 error, 0 warnings)


You may use special comments to disable some warnings.
Use // eslint-disable-next-line to ignore the next line.
Use /* eslint-disable */ to ignore all warnings in a file.
ERROR in [eslint]
D:\dataGitMy\qiuer-qiankun\vue-demo\src\public-path.js
  2:3  error  '__webpack_public_path__' is not defined  no-undef

✖ 1 problem (1 error, 0 warnings)


webpack compiled with 1 error
```
原因：
  no-def ESLint 规则警告您使用未声明的变量，要告诉 ESLint __webpack_public_path__ 是一个全局变量。
  方案一：
    在这个 js 文件中添加注释 `/* global __webpack_public_path__:writable */`
  方案二：
    在 ESLint 配置中:
    ```js
    {
      "globals": {
        "__webpack_public_path__": "writable"
      }
    }
    ```





