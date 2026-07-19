import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardPlaceholderProps = {
  title: string;
};

export function DashboardPlaceholder({ title }: DashboardPlaceholderProps) {
  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Esta sección estará disponible próximamente.
        </p>
      </CardContent>
    </Card>
  );
}
