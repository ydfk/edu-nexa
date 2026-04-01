import { PageContent } from "@/components/page-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StatisticsPage() {
  return (
    <PageContent>
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">统计看板</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">无</CardContent>
    </Card>
    </PageContent>
  );
}
