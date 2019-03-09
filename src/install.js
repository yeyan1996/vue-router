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
      // this指向调用beforeCreate的对象(Vue的根实例/组件)
      // 每次一个组件初始化的时候都会调用beforeCreate方法执行相应函数
      if (isDef(this.$options.router)) { // 如果是Vue的根实例，即整个Vue组件初始化的时候(this.$options.router等于在Vue构造函数传入的router对象)
        this._routerRoot = this // 将routerRoot等于Vue
        this._router = this.$options.router // 给根实例添加_router属性等于router对象
        this._router.init(this) // 执行init方法传入根实例（即在index.js中VueRouter这个class的init方法）
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
          // 不是Vue的根实例则组件的_routerRoot等于Vue根实例
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      registerInstance(this, this)
    },
    destroyed () {
      registerInstance(this)
    }
  })
    // 定义$router指向new Vue时候传入的router对象
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
