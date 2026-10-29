/**
 * 注册、登录处理库
 */
import { getDatabase } from '../database/cloudbase-service'

export async function register(email: string, password: string) {
    // 获取数据库连接
    const db = await getDatabase();

    // 检查邮箱是否已注册
    console.log('检查邮箱是否已注册:', email)
    const user = await db.collection('web_users').where({email}).getOne()
    if (user) {
        return {
            success: false,
            message: '邮箱已注册',
        }
    }

    // 创建用户
    const result = await db.collection('web_users').add({
        email,
        password,
        created_at: new Date(),
        updated_at: new Date(),
    })

    return {success: true, message: '注册成功', data: result}
}