import * as bcryptjs from 'bcryptjs'
// 加密
export const encryptPwd = (password) => {
  return bcryptjs.hashSync(password, 10)
}
// 解密
export const compareSyncPwd = (password, encryptPassword) => {
  return bcryptjs.compareSync(password, encryptPassword)
}

// 数组转树形结构
export const arrayToTree = <T>(
  list: T[],
  id = 'id',
  parentId = 'parentId',
  children = 'children'
) => {
  const treeList: T[] = [],
    map = {}
  list.forEach((item) => {
    if (!item[children]) item[children] = []
    map[item[id]] = item
  })
  list.forEach((item) => {
    const parent = map[item[parentId]]
    if (parent) parent[children].push(item)
    else treeList.push(item)
  })
  return treeList
}
