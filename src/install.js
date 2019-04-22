import View from './components/view'
import Link from './components/link'
import VueRouter from "./index";

export let _Vue

export function install (Vue) {
  if (install.installed && _Vue === Vue) return
  install.installed = true

  _Vue = Vue

  const isDef = v => v !== undefined

  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }

  Vue.mixin({
    beforeCreate () {
      if (isDef(this.$options.router)) { // 只有Vue的根实例在$options中含有router对象
        this._routerRoot = this // 将routerRoot等于根实例
        this._router = this.$options.router // 给根实例添加_router属性等于router对象
        /**执行init方法初始化路由传入根实例**/
        this._router.init(this)
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
