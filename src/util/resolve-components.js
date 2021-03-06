/* @flow */

import { _Vue } from '../install'
import { warn, isError } from './warn'

//解析异步路由（传入当前新增的路由记录）
export function resolveAsyncComponents (matched: Array<RouteRecord>): Function {
  return (to, from, next) => {
    let hasAsync = false
    let pending = 0
    let error = null

    flatMapComponents(matched, /*解析matched中的异步组件*/(def, _, match, key) => {
      // if it's a function and doesn't have cid attached,
      // assume it's an async component resolve function.
      // we are not using Vue's default async resolving mechanism because
      // we want to halt the navigation until the incoming component has been
      // resolved.
      if (typeof def === 'function' && def.cid === undefined) {
        hasAsync = true
        pending++

        /**以下代码会等到异步组件获取到后，在微任务队列中执行**/
        const resolve = once(resolvedDef => {
          if (isESModule(resolvedDef)) {
            resolvedDef = resolvedDef.default
          }
          // save resolved on async factory in case it's used elsewhere
          def.resolved = typeof resolvedDef === 'function'
            ? resolvedDef
            : _Vue.extend(resolvedDef) // 这个组件构造器不知道哪里使用的。。。。
            // 将解析后的组件配置项赋值给路由中components属性（将组件配置项覆盖原来的()=>import(.....)）
          match.components[key] = resolvedDef
          pending--
          if (pending <= 0) {
            // 当匹配到的route中的 matched属性里记录的路由组件都被解析成功后，执行iterator next ，在 runQueue 中解析 queue 的下个元素
            // iterator next（src/history/base.js:154）
            next()
          }
        })

        const reject = once(reason => {
          const msg = `Failed to resolve async component ${key}: ${reason}`
          process.env.NODE_ENV !== 'production' && warn(false, msg)
          if (!error) {
            error = isError(reason)
              ? reason
              : new Error(msg)
            // 发生错误时，执行iterator next，最终会中断导航
            next(error)
          }
        })

        let res
        try {
          res = def(resolve, reject)
        } catch (e) {
          reject(e)
        }
        if (res) {
          if (typeof res.then === 'function') {
            res.then(resolve, reject)
          } else {
            // new syntax in Vue 2.3
            const comp = res.component
            if (comp && typeof comp.then === 'function') {
              comp.then(resolve, reject)
            }
          }
        }
      }
    })

    if (!hasAsync) next()
  }
}

// 扁平化后执行fn作为返回值
export function flatMapComponents (
  matched: Array<RouteRecord>,
  fn: Function
): Array<?Function> {
  // 数组扁平化
  return flatten(matched.map(m => {
    // 遍历components属性（一般为component，vue-router会把component变成components，因为有命名视图的可能）
      // 如果是component衍变的key为default，否则为自己定义的key值
    return Object.keys(m.components).map(key => fn(
        m.components[key], // 组件(key一般为default)，当是路由懒加载时这个值为函数（()=> import(.....)）
        m.instances[key], // 实例(实例默认为空对象，在registerInstance时，会在router-view中创建组件实例) （src/components/view.js:58）
        m, //路由记录
        key //视图名（一般为default）即使用默认组件
    ))
  }))
}

export function flatten (arr: Array<any>): Array<any> {
  return Array.prototype.concat.apply([], arr)
}

const hasSymbol =
  typeof Symbol === 'function' &&
  typeof Symbol.toStringTag === 'symbol'

function isESModule (obj) {
  return obj.__esModule || (hasSymbol && obj[Symbol.toStringTag] === 'Module')
}

// in Webpack 2, require.ensure now also returns a Promise
// so the resolve/reject functions may get called an extra time
// if the user uses an arrow function shorthand that happens to
// return that Promise.
function once (fn) {
  let called = false
  return function (...args) {
    if (called) return
    called = true
    return fn.apply(this, args)
  }
}
