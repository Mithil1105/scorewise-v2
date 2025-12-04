import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface TopicCardProps {
  id: string;
  name: string;
  description: string;
  exerciseCount?: number;
  topicType: 'predefined' | 'institute';
}

export function TopicCard({ id, name, description, exerciseCount, topicType }: TopicCardProps) {
  const linkPath = topicType === 'predefined' 
    ? `/grammar/topic/predefined/${id}`
    : `/grammar/topic/institute/${id}`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {name}
            </CardTitle>
            <CardDescription className="mt-2 line-clamp-2">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {exerciseCount !== undefined && (
            <span className="text-sm text-muted-foreground">
              {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
            </span>
          )}
          <Button asChild variant="default" size="sm">
            <Link to={linkPath}>
              Start Practice
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

