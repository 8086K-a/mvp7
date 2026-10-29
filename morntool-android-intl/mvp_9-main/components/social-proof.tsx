"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Star, Quote } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

const testimonials = {
  zh: [
    {
      name: "张总监",
      company: "科技公司CEO",
      content: "通过分享获得的高级功能完全满足了我们团队的需求，病毒式增长模式很棒！",
      rating: 5,
    },
    {
      name: "李经理",
      company: "金融机构",
      content: "安全性和便利性的完美结合，邀请同事后解锁的功能让工作效率提升了很多。",
      rating: 5,
    },
    {
      name: "王创始人",
      company: "创业公司",
      content: "免费版本就很强大，付费版本的ROI非常高，推荐给所有需要安全分享的团队。",
      rating: 5,
    },
  ],
  en: [
    {
      name: "John Director",
      company: "Tech Company CEO",
      content: "The premium features obtained through sharing completely meet our team's needs, the viral growth model is great!",
      rating: 5,
    },
    {
      name: "Lisa Manager",
      company: "Financial Institution",
      content: "Perfect combination of security and convenience, the unlocked features after inviting colleagues have greatly improved work efficiency.",
      rating: 5,
    },
    {
      name: "Mike Founder",
      company: "Startup Company",
      content: "The free version is already powerful, the paid version has very high ROI, recommended for all teams that need secure sharing.",
      rating: 5,
    },
  ]
}

export function SocialProof() {
  const { t, language } = useLanguage()
  const currentTestimonials = testimonials[language]

  return (
    <section className="px-6 py-16 bg-gray-50">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('social.title')}</h2>
          <p className="text-gray-600">{t('social.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {currentTestimonials.map((testimonial, index) => (
            <Card key={index} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <Quote className="h-8 w-8 text-gray-300 mb-4" />
                <p className="text-gray-700 mb-4">{testimonial.content}</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.company}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
