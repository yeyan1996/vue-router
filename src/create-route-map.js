/* @flow */

import Regexp from 'path-to-regexp'
import { cleanPath } from './util/path'
import { assert, warn } from './util/warn'

//第一次执行时后面3个参数都是undefined
export function createRouteMap (
  routes: Array<RouteConfig>,
  oldPathList?: Array<string>,
  oldPathMap?: Dictionary<RouteRecord>,
  oldNameMap?: Dictionary<RouteRecord>
): {
  // 返回3个对象pathList,pathMap,nameMap
  pathList: Array<string>;
  pathMap: Dictionary<RouteRecord>;
  nameMap: Dictionary<RouteRecord>;
} {
  // 设置默认值
  // 当已经完整执行过createRouteMap，使用addRoutes动态添加路由时，pathMap，nameMap会有值，否则为空
  // the path list is used to control path matching priority
  const pathList: Array<string> = oldPathList || []
  // $flow-disable-line
  const pathMap: Dictionary<RouteRecord> = oldPathMap || Object.create(null)
  // $flow-disable-line
  const nameMap: Dictionary<RouteRecord> = oldNameMap || Object.create(null)

  routes.forEach(route => {
      // 遍历每项路由数组，执行addRouteRecord函数，将上面3个参数和当前的遍历项作为参数传入
      // 根据routes生成3个路由信息(pathList, pathMap, nameMap)
    addRouteRecord(pathList, pathMap, nameMap, route)
  })

    // pathList数组中含有通配符（*），会把他放到结尾
   // ensure wildcard routes are always at the end
  for (let i = 0, l = pathList.length; i < l; i++) {
    if (pathList[i] === '*') {
      pathList.push(pathList.splice(i, 1)[0])
      l--
      i--
    }
  }

  return {
    pathList,
    pathMap,
    nameMap
  }
}

//addRouteRecord会遍历所有routes逐步给pathMap/nameMap添加路由的信息（record）
function addRouteRecord (
    //第一次调用前3个参数为空对象
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>,
  route: RouteConfig,  // 第一次调用时只有route有值，为当前遍历到的route对象
  parent?: RouteRecord,
  matchAs?: string //路由别名
) {
  // 获取路由的path属性和name属性
  const { path, name } = route
    // 非空判断
  if (process.env.NODE_ENV !== 'production') {
    assert(path != null, `"path" is required in a route configuration.`)
    assert(
      typeof route.component !== 'string',
      `route config "component" for path: ${String(path || name)} cannot be a ` +
      `string id. Use an actual component instead.`
    )
  }

  const pathToRegexpOptions: PathToRegexpOptions = route.pathToRegexpOptions || {}
  // 规范化路由（如果当前route有父route，则返回一个父子的完整路径）
    // e.g "/parent/child"
  const normalizedPath = normalizePath(
    path,
    parent,
    pathToRegexpOptions.strict
  )
    // 用的不多
  if (typeof route.caseSensitive === 'boolean') {
    pathToRegexpOptions.sensitive = route.caseSensitive
  }

  // 定义当前route的路由记录
  const record: RouteRecord = {
    path: normalizedPath, // 规范化后的路由
    regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
    components: route.components || { default: route.component },
    instances: {},
    name,
    parent,
    matchAs,
    redirect: route.redirect,
    beforeEnter: route.beforeEnter,
    meta: route.meta || {},
    props: route.props == null
      ? {}
      : route.components
        ? route.props
        : { default: route.props }
  }

  if (route.children) {
    // Warn if route is named, does not redirect and has a default child route.
    // If users navigate to this route by name, the default child will
    // not be rendered (GH Issue #629)
    if (process.env.NODE_ENV !== 'production') {
      if (route.name && !route.redirect && route.children.some(child => /^\/?$/.test(child.path))) {
        warn(
          false,
          `Named Route '${route.name}' has a default child route. ` +
          `When navigating to this named route (:to="{name: '${route.name}'"), ` +
          `the default child route will not be rendered. Remove the name from ` +
          `this route and use the name of the default child route for named ` +
          `links instead.`
        )
      }
    }
    // 递归遍历children数组执行addRouteRecord方法
    route.children.forEach(child => {
      const childMatchAs = matchAs
        ? cleanPath(`${matchAs}/${child.path}`)
        : undefined
        // 与第一次调用addRouteRecord不同的是，递归遍历children会额外传入record,childMatchAs参数
        // record是当前路由项，即子组件父路由的路由记录
      addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs)
    })
  }
  // 用的不多
  if (route.alias !== undefined) {
    const aliases = Array.isArray(route.alias)
      ? route.alias
      : [route.alias]

    aliases.forEach(alias => {
      const aliasRoute = {
        path: alias,
        children: route.children
      }
      addRouteRecord(
        pathList,
        pathMap,
        nameMap,
        aliasRoute,
        parent,
        record.path || '/' // matchAs
      )
    })
  }

    // 递归遍历到最底部的route(叶子节点)
    // 构造pathMap和nameMap映射表

    // 第一次pathMap为空对象，后续使用addRoutes动态添加路由时会有已有的路由映射表）
  if (!pathMap[record.path]) {
    // pathList是一个数组，保存着routes列表中所有route的路径
      pathList.push(record.path)
      // pathMap是一个对象，保存着routes列表中所有route的记录（87）
      // 属性是route的路径，值是route的记录
    pathMap[record.path] = record
  }

    // 给nameMap同样添加record对象
    // pathMap和nameMap不同的是键名，一个由path路由路径作为键,一个由name路由名称作为键
  if (name) {
    if (!nameMap[name]) {
      nameMap[name] = record
    } else if (process.env.NODE_ENV !== 'production' && !matchAs) {
      warn(
        false,
        `Duplicate named routes definition: ` +
        `{ name: "${name}", path: "${record.path}" }`
      )
    }
  }
}

function compileRouteRegex (path: string, pathToRegexpOptions: PathToRegexpOptions): RouteRegExp {
  const regex = Regexp(path, [], pathToRegexpOptions)
  if (process.env.NODE_ENV !== 'production') {
    const keys: any = Object.create(null)
    regex.keys.forEach(key => {
      warn(!keys[key.name], `Duplicate param keys in route with path: "${path}"`)
      keys[key.name] = true
    })
  }
  return regex
}

// 标准化路由的方法
// 如果path的第一个字符为/则直接返回
function normalizePath (path: string, parent?: RouteRecord, strict?: boolean): string {
  if (!strict) path = path.replace(/\/$/, '')
  if (path[0] === '/') return path
  if (parent == null) return path
    // 如果有含有父路由会进入这个方法
    // 将父路由的path值拼上子路由的path值返回该子路由完整的path值
  return cleanPath(`${parent.path}/${path}`)
}
