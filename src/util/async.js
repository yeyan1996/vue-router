/* @flow */

//因为路由之间的切换可能是异步的（可能会写setTimeout(next,2000)）
// 所以设计了一个队列，当前面一个元素被解析后调用next方法才继续解析下个元素
export function runQueue (queue: Array<?NavigationGuard>, /*fn指iterator*/fn: Function, cb: Function) {
  const step = index => {
    if (index >= queue.length) {
      cb() //遍历结束后执行回调
    } else {
      if (queue[index]) {
          // queue[index]即hook函数
          // 剪头函数是fn的第二个参数也就是传入给iterator函数的next
          // 执行iterator函数，传入NavigationGuard（函数）组成的数组的每个元素，执行完后执行回调（index+1）
        fn(queue[index], () => {
          step(index + 1)
        })
      } else {
        step(index + 1)
      }
    }
  }
  step(0)
}
