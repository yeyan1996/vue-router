import View from './components/view'
import Link from './components/link'
import VueRouter from "./index";

export let _Vue

export function install (Vue) {
  if (install.installed && _Vue === Vue) return
  install.installed = true

  _Vue = Vue

  const isDef = v => v !== undefined

  //注册组件实例（src/components/view.js:58）
  const registerInstance = (vm, callVal) => {
    //i为router-view组件占位符vnode
      // 这里会执行registerRouteInstance，将当前组件实例赋值给匹配到的路由记录（用于beforeRouteEnter的回调获取vm实例）
    let i = vm.$options._parentVnode
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }

  Vue.mixin({
      // 全局混入，在beforeCreate中会初始化当前路由的信息

    /** vue-router流程
     * 触发路由跳转 => transitionTo => 执行准备离开的路由的钩子 => 接受到异步组件并解析 => 执行准备进入的路由的钩子
     * 确认导航成功 =>  触发beforeRouterEnter的回调 => 更新视图 **/
    beforeCreate () {
        //当是根实例时会进行路由初始化操作
      if (isDef(this.$options.router)) {
        this._routerRoot = this // 将routerRoot等于根实例
        this._router = this.$options.router // 给根实例添加_router属性等于router对象
        /**执行init方法初始化路由传入根实例**/
        this._router.init(this)
          /**将根实例的_router属性，即组件实例的$route属性定义为响应式，每次路由确认导航时会触发setter，将根实例重新渲染**/
          //每次路由切换都会执行回调修改_router(src/index.js:125)
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        // 非根实例则等于它父组件的_routerRoot(因为是树形结构所以所有的组件的_routerRoot都等于根实例)
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      registerInstance(this, this)
    },
    destroyed () {
      registerInstance(this)
    }
  })
    // 定义$router指向根实例的router对象
  Object.defineProperty(Vue.prototype, '$router', {
    get () { return this._routerRoot._router }
  })

    // 定义$router指向当前的路由
  Object.defineProperty(Vue.prototype, '$route', {
    get () { return this._routerRoot._route }
  })

    // 全局注册RouterView,RouterLink
  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)

  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}
