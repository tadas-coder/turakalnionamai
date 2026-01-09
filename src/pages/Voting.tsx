import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Vote, Calendar, Users, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// Mock data - will be replaced with Cloud data
const polls = [
  {
    id: 1,
    title: "Kiemo apšvietimo atnaujinimas",
    description: "Ar pritariate kiemo apšvietimo sistemos modernizavimui? Numatoma kaina: 2500 EUR",
    options: [
      { id: 1, text: "Taip, pritariu", votes: 15 },
      { id: 2, text: "Ne, nepritariu", votes: 5 },
      { id: 3, text: "Susilaikau", votes: 3 },
    ],
    status: "active",
    endDate: "2024-02-15",
    totalVoters: 45,
    votedCount: 23,
  },
  {
    id: 2,
    title: "Laiptinės remonto darbai",
    description: "Balsavimas dėl laiptinės dažymo ir remonto darbų 2024 metais",
    options: [
      { id: 1, text: "Atlikti remontą pavasarį", votes: 20 },
      { id: 2, text: "Atlikti remontą rudenį", votes: 12 },
      { id: 3, text: "Atidėti kitais metais", votes: 8 },
    ],
    status: "active",
    endDate: "2024-02-20",
    totalVoters: 45,
    votedCount: 40,
  },
  {
    id: 3,
    title: "Vaizdo stebėjimo kameros",
    description: "Ar reikėtų įrengti vaizdo stebėjimo kameras bendrose erdvėse?",
    options: [
      { id: 1, text: "Taip, įrengti", votes: 30 },
      { id: 2, text: "Ne, neįrengti", votes: 10 },
    ],
    status: "ended",
    endDate: "2024-01-10",
    totalVoters: 45,
    votedCount: 40,
  },
];

export default function Voting() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [votedPolls, setVotedPolls] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const handleVote = (pollId: number, optionId: number) => {
    setVotedPolls({ ...votedPolls, [pollId]: optionId });
    toast.success("Jūsų balsas užregistruotas!");
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return <Badge className="bg-success text-success-foreground">Aktyvus</Badge>;
    }
    return <Badge variant="secondary">Pasibaigęs</Badge>;
  };

  return (
    <Layout>
      <div className="py-12 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full mb-4">
                <Vote className="h-4 w-4" />
                <span className="text-sm font-medium">Balsavimas</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                Bendrijos apklausos
              </h1>
              <p className="text-muted-foreground">
                Dalyvaukite priimant svarbius bendrijos sprendimus
              </p>
            </div>

            <div className="space-y-6">
              {polls.map((poll, index) => {
                const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                const hasVoted = votedPolls[poll.id] !== undefined;
                const isEnded = poll.status === "ended";

                return (
                  <Card 
                    key={poll.id} 
                    className="card-elevated animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-xl">{poll.title}</CardTitle>
                          <CardDescription className="mt-2">{poll.description}</CardDescription>
                        </div>
                        {getStatusBadge(poll.status)}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {poll.options.map((option) => {
                        const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                        const isSelected = votedPolls[poll.id] === option.id;

                        return (
                          <div key={option.id} className="space-y-2">
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              className="w-full justify-start h-auto py-3 px-4"
                              disabled={hasVoted || isEnded}
                              onClick={() => handleVote(poll.id, option.id)}
                            >
                              <span className="flex-1 text-left">{option.text}</span>
                              {(hasVoted || isEnded) && (
                                <span className="text-sm font-medium">
                                  {percentage.toFixed(0)}%
                                </span>
                              )}
                              {isSelected && <CheckCircle2 className="h-4 w-4 ml-2" />}
                            </Button>
                            {(hasVoted || isEnded) && (
                              <Progress value={percentage} className="h-2" />
                            )}
                          </div>
                        );
                      })}
                    </CardContent>

                    <CardFooter className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{poll.votedCount} iš {poll.totalVoters} balsavo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEnded ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                        <span>
                          {isEnded ? "Baigėsi" : "Baigiasi"}: {poll.endDate}
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
