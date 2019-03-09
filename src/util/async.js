/* @flow */

// fn指iterator
export function runQueue (queue: Array<?NavigationGuard>, fn: Function, cb: Function) {
  const step = index => {
    if (index >= queue.length) {
      cb()
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
