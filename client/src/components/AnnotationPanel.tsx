import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ANNOTATION_TYPES } from "@/lib/constants";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { SessionRecord, AnnotationRecord } from "@/lib/types";

interface Props {
  caseId: number;
  sessions: SessionRecord[];
  annotations: AnnotationRecord[];
  isAdmin: boolean;
}

export default function AnnotationPanel({ caseId, sessions, annotations, isAdmin }: Props) {
  const utils = trpc.useUtils();
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [content, setContent] = useState("");
  const [annotationType, setAnnotationType] = useState<keyof typeof ANNOTATION_TYPES>("direction");
  const [showForm, setShowForm] = useState(false);

  const createAnnotation = trpc.annotations.create.useMutation({
    onSuccess: () => {
      utils.annotations.listByCase.invalidate({ caseId });
      utils.annotations.listBySession.invalidate();
      setContent("");
      setSelectedSession("");
      setShowForm(false);
      toast.success("批注已添加");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAnnotation = trpc.annotations.delete.useMutation({
    onSuccess: () => {
      utils.annotations.listByCase.invalidate({ caseId });
      toast.success("批注已删除");
    },
  });

  const markRead = trpc.annotations.markRead.useMutation({
    onSuccess: () => {
      utils.annotations.listByCase.invalidate({ caseId });
    },
  });

  const handleSubmit = () => {
    if (!selectedSession) { toast.error("请选择关联的咨询记录"); return; }
    if (!content.trim()) { toast.error("请输入批注内容"); return; }
    createAnnotation.mutate({
      sessionId: Number(selectedSession),
      caseId,
      content,
      annotationType,
    });
  };

  return (
    <div className="space-y-4">
      {/* 督导添加批注 */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">添加督导批注</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 text-xs">
                <Plus size={12} /> 新增批注
              </Button>
            </div>
          </CardHeader>
          {showForm && (
            <CardContent className="pt-0 space-y-3">
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="选择关联的咨询记录" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      第 {s.sessionNumber} 次咨询 · {format(new Date(s.sessionDate), 'MM月dd日', { locale: zhCN })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-5 gap-2">
                {Object.entries(ANNOTATION_TYPES).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAnnotationType(k as keyof typeof ANNOTATION_TYPES)}
                    className={`p-2 rounded-lg border text-xs text-center transition-all ${
                      annotationType === k ? 'border-2 font-medium' : 'border hover:bg-muted/30'
                    }`}
                    style={annotationType === k ? { borderColor: v.color, background: `${v.color}10`, color: v.color } : {}}
                  >
                    <div className="text-base mb-0.5">{v.icon}</div>
                    {v.label}
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="请输入批注内容，指出方向是否正确、需要注意的要点、策略调整建议..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
                className="text-sm resize-none"
              />

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>取消</Button>
                <Button size="sm" onClick={handleSubmit} disabled={createAnnotation.isPending}>
                  {createAnnotation.isPending ? '提交中...' : '提交批注'}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 批注列表 */}
      {annotations.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-sm text-muted-foreground">暂无督导批注</p>
          {!isAdmin && <p className="text-xs text-muted-foreground mt-1">督导会在咨询记录上添加指导意见</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {annotations.map(a => {
            const aType = ANNOTATION_TYPES[a.annotationType as keyof typeof ANNOTATION_TYPES];
            const session = sessions.find(s => s.id === a.sessionId);
            return (
              <div
                key={a.id}
                className={`p-4 rounded-xl ${aType.cssClass} ${!a.isRead && !isAdmin ? 'ring-1 ring-amber-300' : ''}`}
                onClick={() => !a.isRead && !isAdmin && markRead.mutate({ id: a.id })}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold" style={{ color: aType.color }}>
                        {aType.icon} {aType.label}
                      </span>
                      {session && (
                        <span className="text-xs text-muted-foreground">
                          · 关联第 {session.sessionNumber} 次咨询
                        </span>
                      )}
                      {!a.isRead && !isAdmin && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">未读</span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(a.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => deleteAnnotation.mutate({ id: a.id })}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
