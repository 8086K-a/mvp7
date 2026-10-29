import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveDeploymentRegion } from '@/lib/config/deployment-region';

// 延迟初始化 Supabase 客户端
let supabaseInstance: any = null;

function getSupabase() {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase 配置缺失: NEXT_PUBLIC_SUPABASE_URL 和/或 SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY 未设置');
        }

        supabaseInstance = createClient(supabaseUrl, supabaseKey);
    }

    return supabaseInstance;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, credits, amount, userEmail } = body;
        console.log('update-credits into post:', body);
        if (!userId || !credits || !amount || !userEmail) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, credits, amount, userEmail' },
                { status: 400 }
            );
        }

        // 检测部署区域
        const isChinaRegion = resolveDeploymentRegion() === 'CN';

        if (!isChinaRegion) {
            // 更新 Supabase 数据库
            const { data, error } = await getSupabase()
                .from('user')
                .update({ credits })
                .eq('id', userId)
                .select();

            if (error) {
                console.error('Supabase 更新用户积分失败:', error);
                return NextResponse.json(
                    { error: 'Failed to update credits in Supabase' },
                    { status: 500 }
                );
            }

            // 记录交易
            const { error: transactionError } = await getSupabase()
                .from('credit_transactions')
                .insert({
                    user_id: userId,
                    type: 'purchase',
                    amount: amount,
                    description: `Purchased ${amount} credits`,
                    reference_id: `purchase_${Date.now()}`
                });

            if (transactionError) {
                console.error('Supabase 记录交易失败:', transactionError);
                // 即使交易记录失败，也要返回成功，因为主要操作已完成
            }
        } else {
            // 更新腾讯云 CloudBase 数据库
            try {
                const cloudbaseService = await import('@/lib/database/cloudbase-service');
                const db = await cloudbaseService.getDatabase();

                if (db) {
                    // 更新用户积分
                    const collection = await db.collection('web_users');
                    await collection.doc(userId).update({
                        credits: credits
                    });

                    // 记录交易
                    await db.collection('web_credit_transactions').add({
                        user_id: userId,
                        type: 'purchase',
                        amount: amount,
                        description: `Purchased ${amount} credits`,
                        reference_id: `purchase_${Date.now()}`,
                        created_at: new Date().toISOString(),
                    });
                }
            } catch (error) {
                console.error('CloudBase 更新用户积分失败:', error);
                return NextResponse.json(
                    { error: 'Failed to update credits in CloudBase' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Credits updated successfully',
            newCredits: credits
        });
    } catch (error) {
        console.error('更新用户积分错误:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
