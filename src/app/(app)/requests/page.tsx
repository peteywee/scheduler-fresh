import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  
  export default function RequestsPage() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shift Requests</CardTitle>
          <CardDescription>
            Review and approve or deny shift change requests from staff.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">
            <p>Request management feature coming soon.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  