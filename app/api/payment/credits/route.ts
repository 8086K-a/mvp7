import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { AlipaySdk } from 'alipay-sdk'
import type { AlipaySdkSignType, AlipaySdkConfig } from 'alipay-sdk'
import { createClient } from '@supabase/supabase-js'
import { getDatabase } from '@/lib/database/cloudbase-service'
import { createWechatNativeOrder, getWechatAppId, getWechatMchId } from '@/lib/utils/wechatpay-v3-lite'

// 延迟初始化 Supabase 客户端，避免在构建时初始化
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

// Stripe 配置
let stripe: Stripe | null = null;

function getStripe() {
    if (!stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('Missing Stripe secret key');
        }
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-10-29.clover',
        });
    }
    return stripe;
}

// 支付宝支付配置
const alipayConfig: AlipaySdkConfig = {
    appId: process.env.ALIPAY_APP_ID || '2021005199628151',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
    signType: 'RSA2' as AlipaySdkSignType,
    charset: 'utf-8',
    version: '1.0',
};

// 动态导入支付宝 SDK，避免构建时初始化
async function getAlipaySdk() {
    const { AlipaySdk } = await import('alipay-sdk');
    return new AlipaySdk(alipayConfig);
}

// 价格配置
const USD_TO_CNY_RATE = 1;

// 积分包定价配置
const CREDIT_PACKAGES = [
    { amount: 50, price: 0.01 },
    { amount: 100, price: 0.01 },
    { amount: 250, price: 0.01 },
    { amount: 500, price: 0.01 }
];

/**
 * 获取指定积分数量的价格
 */
function getPriceByCreditAmount(creditAmount: number): number | null {
    const pkg = CREDIT_PACKAGES.find(p => p.amount === creditAmount);
    return pkg ? pkg.price : null;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { paymentMethod, creditAmount, userEmail, returnUrl, cancelUrl } = body;
        console.log('into credits body: ',  body);
        if (!paymentMethod || !creditAmount || !userEmail) {
            return NextResponse.json(
                { error: 'Missing required fields: paymentMethod, creditAmount, userEmail' },
                { status: 400 }
            );
        }

        // 获取积分包价格
        const priceUSD = getPriceByCreditAmount(creditAmount);
        if (!priceUSD) {
            return NextResponse.json(
                { error: 'Invalid credit amount' },
                { status: 400 }
            );
        }

        switch (paymentMethod) {
            case 'stripe':
                // 检查 Stripe 是否已配置
                if (!process.env.STRIPE_SECRET_KEY) {
                    return NextResponse.json(
                        { error: 'Stripe payment is not configured' },
                        { status: 500 }
                    );
                }

                // 创建 Stripe Checkout 会话
                const stripe = getStripe();
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [
                        {
                            price_data: {
                                currency: 'usd',
                                product_data: {
                                    name: `${creditAmount} Credits`,
                                    description: `Purchase ${creditAmount} credits for SiteHub tools`,
                                },
                                unit_amount: Math.round(priceUSD * 100), // 转换为美分
                            },
                            quantity: 1,
                        },
                    ],
                    mode: 'payment',
                    success_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/payment/cancel`,
                    customer_email: userEmail,
                    metadata: {
                        paymentType: 'credits',
                        creditAmount: creditAmount.toString(),
                        userEmail: userEmail,
                    },
                });

                return NextResponse.json({
                    sessionId: session.id,
                    url: session.url,
                });

            case 'wechatpay':
                console.log('into wechatpay');
                // 检查微信支付是否已配置
                try {
                    getWechatMchId();
                    getWechatAppId();
                } catch (initError: any) {
                    return NextResponse.json(
                        {
                            error: initError?.message || 'WeChat Pay is not configured',
                            message: 'Please contact support for assistance'
                        },
                        { status: 500 }
                    );
                }

                // 计算金额（人民币，单位：分）
                const amountCNY = priceUSD * USD_TO_CNY_RATE;
                const amountInCents = Math.round(amountCNY * 100); // 转换为分

                // 生成订单号
                const outTradeNo = `WC${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

                // 创建支付订单
                const response = await createWechatNativeOrder({
                    description: `SiteHub - ${creditAmount} Credits`,
                    outTradeNo,
                    notifyUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/webhook/wechat`,
                    amountInCents,
                });
                console.log('🚀 ~ file: 调用微信支付API创建订单 ~ POST ~ response:', response);
                // 保存交易记录到数据库
                const transactionRecord = {
                    user_email: userEmail,
                    credit_amount: creditAmount,
                    amount_usd: priceUSD,
                    amount_cny: amountCNY,
                    payment_method: 'wechat',
                    transaction_id: outTradeNo,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                // 根据用户来源保存到不同数据库
                try {
                    // 保存到腾讯云（国内用户）
                    const db =  await getDatabase();
                    await db.collection('web_payment_transactions').add(transactionRecord);
                } catch (error) {
                    console.error('❌ 保存交易记录失败（腾讯云）:', error);
                    // 如果腾讯云失败，尝试Supabase
                    try {
                        await getSupabase().from('payment_transactions').insert(transactionRecord);
                    } catch (supabaseError) {
                        console.error('❌ 保存交易记录失败（Supabase）:', supabaseError);
                    }
                }

                // 返回支付参数
                return NextResponse.json({
                    success: true,
                    outTradeNo,
                    qrCodeUrl: response.code_url, // 扫码支付链接
                    prepayId: response.prepay_id,
                    // 前端需要的支付参数
                    paymentParams: {
                        appId: getWechatAppId(),
                        timeStamp: Math.floor(Date.now() / 1000).toString(),
                        nonceStr: Math.random().toString(36).substr(2, 15),
                        package: `prepay_id=${response.prepay_id}`,
                        signType: 'RSA',
                        // paySign 需要前端根据其他参数计算
                    },
                });

            case 'alipay':
                // 检查支付宝配置
                if (!alipayConfig.appId || !alipayConfig.privateKey || !alipayConfig.alipayPublicKey) {
                    return NextResponse.json(
                        {
                            error: 'Alipay payment is currently unavailable. Please use Stripe or another method.',
                            errorCode: 'ALIPAY_NOT_CONFIGURED',
                            details: 'Alipay credentials are not configured. Contact support.',
                        },
                        { status: 503 }
                    );
                }

                // 转换为人民币
                const amountCNYFixed = (priceUSD * USD_TO_CNY_RATE).toFixed(2);

                // 生成订单号
                const outTradeNoAlipay = `ALIPAY_CREDITS_${creditAmount}_${Date.now()}`;

                // 订单描述
                const subject = `SiteHub - ${creditAmount} Credits`;
                const body_text = `Purchase ${creditAmount} credits - $${priceUSD}`;

                // 动态获取支付宝 SDK 实例
                const alipaySdk = await getAlipaySdk();

                // 创建支付宝订单参数（按 alipay-sdk pageExec 规范）
                const paymentUrl = await alipaySdk.pageExec(
                    'alipay.trade.page.pay',
                    'GET',
                    {
                        bizContent: {
                            out_trade_no: outTradeNoAlipay,
                            product_code: 'FAST_INSTANT_TRADE_PAY',
                            total_amount: amountCNYFixed,
                            subject: subject,
                            body: body_text,
                        },
                        returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?session_id=${outTradeNoAlipay}`,
                        notifyUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/alipay/notify`,
                    }
                );

                // 保存订单到数据库
                const db =  await getDatabase();
                await db.collection('web_payment_transactions').add({
                    user_email: userEmail,
                    credit_amount: creditAmount,
                    amount_usd: priceUSD,
                    amount_cny: parseFloat(amountCNYFixed),
                    payment_method: 'alipay',
                    transaction_id: outTradeNoAlipay,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                });
                // const {data: alipayDbData, error: alipayDbError} = await date().from('payment_transactions').insert({
                //     user_email: userEmail,
                //     credit_amount: creditAmount,
                //     amount_usd: priceUSD,
                //     amount_cny: parseFloat(amountCNYFixed),
                //     payment_method: 'alipay',
                //     transaction_id: outTradeNoAlipay,
                //     status: 'pending',
                //     created_at: new Date().toISOString(),
                // });
                //
                // if (alipayDbError) {
                //     console.error('⚠️ [Alipay] 数据库保存失败 (不影响支付):', alipayDbError);
                // } else {
                //     console.log('✅ [Alipay] 订单已保存到数据库');
                // }

                // 返回支付链接
                return NextResponse.json({
                    paymentUrl,
                    orderId: outTradeNoAlipay,
                    amount: amountCNYFixed,
                    currency: 'CNY',
                    ok: true,
                });

            case 'paypal':
                // 检查 PayPal 是否已配置
                if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
                    return NextResponse.json(
                        { error: 'PayPal payment is not configured' },
                        { status: 500 }
                    );
                }

                // 获取 PayPal 访问令牌
                const paypalAuth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
                const paypalTokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${paypalAuth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'grant_type=client_credentials',
                });

                if (!paypalTokenResponse.ok) {
                    throw new Error('Failed to get PayPal access token');
                }

                const paypalTokenData = await paypalTokenResponse.json();
                const accessToken = paypalTokenData.access_token;

                // 创建 PayPal 订单
                const paypalOrderResponse = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        intent: 'CAPTURE',
                        purchase_units: [{
                            amount: {
                                currency_code: 'USD',
                                value: priceUSD.toFixed(2),
                            },
                            description: `${creditAmount} Credits for SiteHub tools`,
                            custom_id: JSON.stringify({
                                creditAmount,
                                userEmail,
                                paymentType: 'credits'
                            })
                        }],
                        application_context: {
                            return_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success`,
                            cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/payment/cancel`,
                        }
                    }),
                });

                if (!paypalOrderResponse.ok) {
                    throw new Error('Failed to create PayPal order');
                }

                const paypalOrderData = await paypalOrderResponse.json();

                // 保存订单到数据库
                const { error: dbError } = await getSupabase().from('payment_transactions').insert({
                    user_email: userEmail,
                    credit_amount: creditAmount,
                    amount_usd: priceUSD,
                    payment_method: 'paypal',
                    transaction_id: paypalOrderData.id,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                });

                if (dbError) {
                    console.error('⚠️ [PayPal] 数据库保存失败 (不影响支付):', dbError);
                } else {
                    console.log('✅ [PayPal] 订单已保存到数据库');
                }

                // 返回 PayPal 订单信息
                return NextResponse.json({
                    paymentUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderData.id}`,
                    orderId: paypalOrderData.id,
                    amount: priceUSD.toFixed(2),
                    currency: 'USD',
                });

            case 'crypto':
                // 对于加密货币支付，我们可以使用第三方服务如 CoinBase Commerce 或直接生成地址
                // 这里是一个基本实现，实际应用中可能需要集成专门的加密货币支付服务

                // 生成虚拟的加密货币支付信息
                const orderId = `CRYPTO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // 保存订单到数据库
                const { error: cryptoDbError } = await getSupabase().from('payment_transactions').insert({
                    user_email: userEmail,
                    credit_amount: creditAmount,
                    amount_usd: priceUSD,
                    payment_method: 'crypto',
                    transaction_id: orderId,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                });

                if (cryptoDbError) {
                    console.error('⚠️ [Crypto] 数据库保存失败 (不影响支付):', cryptoDbError);
                } else {
                    console.log('✅ [Crypto] 订单已保存到数据库');
                }

                // 返回加密货币支付信息
                // 在实际实现中，这里应该返回一个加密货币支付页面或钱包地址
                return NextResponse.json({
                    paymentUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/crypto?id=${orderId}`,
                    orderId,
                    amount: priceUSD.toFixed(2),
                    currency: 'USD',
                    // 提醒用户有关加密货币支付的信息
                    message: 'Redirecting to crypto payment page. Please follow the instructions to complete your payment.'
                });

            default:
                return NextResponse.json(
                    { error: 'Unsupported payment method' },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Payment creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create payment session', details: error.message },
            { status: 500 }
        );
    }
}
