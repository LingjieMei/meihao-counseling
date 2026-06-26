import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERSONALITY_TYPES, PERSONALITY_PROFILES } from "@/lib/constants";

export default function PersonalityProfiles() {
  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-light" style={{ fontFamily: "'Noto Serif SC', serif" }}>人格类型参考</h1>
        <p className="text-sm text-muted-foreground mt-1">四种人格类型的通用特征与干预策略——供咨询师学习参考。每个孩子的个性化画像在各自的「案例档案」中填写。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Object.entries(PERSONALITY_PROFILES).map(([key, profile]) => {
          const type = PERSONALITY_TYPES[key as keyof typeof PERSONALITY_TYPES];
          return (
            <Card key={key} className="overflow-hidden">
              <div className="h-1.5" style={{ background: type.color }} />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${type.badgeClass}`}>{profile.title}</span>
                  <span className="text-sm text-muted-foreground">{profile.subtitle}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 典型特征 */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">典型特征</p>
                  <ul className="space-y-1.5">
                    {profile.characteristics.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: type.color }} />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 触发点 */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">常见触发点</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.triggerPoints.map((t, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>

                {/* 干预策略 */}
                <div className="p-3 rounded-xl" style={{ background: `${type.color}08`, border: `1px solid ${type.color}25` }}>
                  <p className="text-xs font-medium mb-1" style={{ color: type.color }}>核心干预策略</p>
                  <p className="text-sm leading-relaxed">{profile.strategy}</p>
                </div>

                {/* 推荐技术 */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">推荐干预技术</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.interventions.map((t, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: `${type.color}15`, color: type.color }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 系统说明 */}
      <Card className="bg-muted/30">
        <CardContent className="pt-5 pb-5">
          <h3 className="text-sm font-medium mb-3">关于四种人格类型</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            四种人格类型是基于大量实践案例归纳出的分类框架，用于快速识别孩子的核心动力来源，从而制定针对性的干预策略。
            每个孩子可能呈现出多种类型的混合特征，分类的目的是找到最主要的驱动力，而非给孩子贴标签。
            在实际咨询中，应结合孩子的具体情况灵活运用，以孩子最在意的点作为激励切入口。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background">
              <p className="text-xs font-medium mb-1">内部系统</p>
              <p className="text-xs text-muted-foreground">孩子 + 家长：问题的核心来源，也是改变的主要场域</p>
            </div>
            <div className="p-3 rounded-lg bg-background">
              <p className="text-xs font-medium mb-1">外部系统</p>
              <p className="text-xs text-muted-foreground">学校/老师 + 同学：外部冲击内部系统的主要来源</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
