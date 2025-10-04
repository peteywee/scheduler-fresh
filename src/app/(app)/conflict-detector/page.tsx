import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ConflictDetector from "@/components/conflict-detector/conflict-detector";

export default function ConflictDetectorPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Conflict Detector</CardTitle>
        <CardDescription>
          Paste your employee availability and current schedule documents below.
          The AI will analyze them and flag any potential conflicts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ConflictDetector />
      </CardContent>
    </Card>
  );
}
