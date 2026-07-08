import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Compass,
  Lock,
  Sparkles,
  Target,
  MessageCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getPathBySlug } from "@/lib/paths";

const PathDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const path = useMemo(() => (slug ? getPathBySlug(slug) : undefined), [slug]);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    path?.sessions[0]?.id ?? null
  );
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [committed, setCommitted] = useState<Record<string, boolean>>({});

  if (!path) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold">Path not found</h1>
          <Button onClick={() => navigate("/paths")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to paths
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const activeSession =
    path.sessions.find((s) => s.id === activeSessionId) ?? path.sessions[0];

  const completedCount = Object.values(completed).filter(Boolean).length;
  const progressPct = (completedCount / path.sessions.length) * 100;

  const setResponse = (key: string, value: string) =>
    setResponses((r) => ({ ...r, [key]: value }));

  const isUnlocked = (idx: number) => {
    if (idx === 0) return true;
    return completed[path.sessions[idx - 1].id] === true;
  };

  const handleComplete = () => {
    setCompleted((c) => ({ ...c, [activeSession.id]: true }));
    setCommitted((c) => ({ ...c, [activeSession.id]: true }));
    const nextIdx = path.sessions.findIndex((s) => s.id === activeSession.id) + 1;
    if (nextIdx < path.sessions.length) {
      setActiveSessionId(path.sessions[nextIdx].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        {/* Back link */}
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        {/* Path header */}
        <div className="relative overflow-hidden rounded-2xl border border-border shadow-card">
          <img
            src={path.image}
            alt=""
            aria-hidden
            loading="lazy"
            width={960}
            height={540}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/85 to-card/50" />
          <div className="relative p-6 md:p-8 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs gap-1 bg-card/70 backdrop-blur">
                <Compass className="h-3 w-3" /> {path.code}
              </Badge>
              <Badge variant="secondary" className="text-xs capitalize bg-card/70 backdrop-blur">
                {path.pillar} pillar
              </Badge>
              <span className="text-xs text-muted-foreground">{path.duration}</span>
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">{path.title}</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">{path.subtitle}</p>
            </div>
            <p className="text-sm text-foreground/80 max-w-3xl leading-relaxed">
              {path.description}
            </p>

            {/* Progress */}
            <div className="space-y-1.5 max-w-md pt-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Path progress</span>
                <span className="font-medium text-foreground">
                  {completedCount} of {path.sessions.length} sessions
                </span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
          </div>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Session list */}
          <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Sessions
            </p>
            {path.sessions.map((session, idx) => {
              const isActive = session.id === activeSession.id;
              const isDone = completed[session.id];
              const unlocked = isUnlocked(idx);

              return (
                <button
                  key={session.id}
                  onClick={() => unlocked && setActiveSessionId(session.id)}
                  disabled={!unlocked}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-all",
                    isActive
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-accent/30",
                    !unlocked && "opacity-50 cursor-not-allowed hover:border-border hover:bg-card"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : !unlocked ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Circle className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Session {session.number}
                      </p>
                      <p className={cn(
                        "text-sm leading-snug mt-0.5",
                        isActive ? "font-semibold text-foreground" : "text-foreground/90"
                      )}>
                        {session.title}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Active session content */}
          <main className="space-y-6 min-w-0">
            {/* Coaching Text */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    Session {activeSession.number}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Coaching</span>
                </div>
                <CardTitle className="text-xl md:text-2xl leading-tight">
                  {activeSession.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <article className="prose prose-sm md:prose-base max-w-none text-foreground/90 leading-relaxed space-y-4">
                  {activeSession.coaching_text.split("\n\n").map((para, i) => (
                    <p key={i} className="text-[15px] leading-relaxed">
                      {para}
                    </p>
                  ))}
                </article>
              </CardContent>
            </Card>

            {/* Reflection Questions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Reflection
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Take your time. There are no right answers — only honest ones.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                {activeSession.questions.map((q, i) => {
                  const key = `${activeSession.id}-q${i}`;
                  return (
                    <div key={key} className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">
                        <span className="text-primary font-semibold mr-1.5">Q{i + 1}.</span>
                        {q}
                      </label>
                      <textarea
                        rows={3}
                        value={responses[key] ?? ""}
                        onChange={(e) => setResponse(key, e.target.value)}
                        placeholder="Type your reflection..."
                        className="w-full rounded-lg border border-input bg-accent/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Micro-commitment */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Micro-commitment
                </CardTitle>
                {activeSession.micro_commitment_note && (
                  <p className="text-xs text-muted-foreground italic">
                    {activeSession.micro_commitment_note}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-[15px] text-foreground leading-relaxed">
                  {activeSession.micro_commitment}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={committed[activeSession.id] ? "outline" : "cta"}
                    size="sm"
                    onClick={() =>
                      setCommitted((c) => ({ ...c, [activeSession.id]: !c[activeSession.id] }))
                    }
                    className="gap-1.5"
                  >
                    {committed[activeSession.id] ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Committed
                      </>
                    ) : (
                      <>I commit to this</>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <MessageCircle className="h-4 w-4" /> Talk it through with Gidget
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Footer nav */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={activeSession.number === 1}
                onClick={() => {
                  const idx = path.sessions.findIndex((s) => s.id === activeSession.id);
                  if (idx > 0) setActiveSessionId(path.sessions[idx - 1].id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Previous
              </Button>

              <Button variant="cta" size="sm" onClick={handleComplete}>
                {activeSession.number === path.sessions.length
                  ? "Complete path"
                  : "Mark complete & continue"}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PathDetail;
