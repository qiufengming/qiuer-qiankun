const path = require('path');
const { name } = require('./package');

module.exports = {
  // transpileDependencies: true,
  devServer: {
    // open: true,
    // 监听端口
    port: 8082,
    // 关闭主机检查，使微应用可以被 fetch
    // disableHostCheck: true,
    historyApiFallback: true,
    allowedHosts: 'all',
    // 配置跨域请求头，解决开发环境的跨域问题
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  configureWebpack: {
    // resolve: {
    //   alias: {
    //     '@': path.resolve(__dirname, 'src'),
    //   },
    // },
    output: {
      // 微应用的包名，这里与主应用中注册的微应用名称一致
      // library: 'vueDemo',
      library: `${name}-[name]`,
      // 将你的 library 暴露为所有的模块定义下都可运行的方式
      libraryTarget: 'umd',
      // 按需加载相关，设置为 webpackJsonp_VueApp 即可
      // jsonpFunction: `webpackJsonp_VueApp`,
      chunkLoadingGlobal: `webpackJsonp_${name}`,
    },
  },
}





