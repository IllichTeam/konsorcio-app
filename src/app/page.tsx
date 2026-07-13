import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Konsorcio</h1>
        <p className="text-muted-foreground text-sm">Página de prueba del design system</p>
      </div>

      <Card className="w-full max-w-md shadow-none rounded-xl">
        <CardHeader>
          <CardTitle className="font-heading">Nuevo consorcio</CardTitle>
          <CardDescription>
            Card sobre fondo con jerarquía por contraste, sin sombras.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Consorcio Los Toros" />
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Badge>Activo</Badge>
            <Badge variant="secondary">12 participantes</Badge>
            <Badge variant="outline">Mensual</Badge>
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button>Crear consorcio</Button>
          <Button variant="outline">Cancelar</Button>
          <Button variant="ghost">Ayuda</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
