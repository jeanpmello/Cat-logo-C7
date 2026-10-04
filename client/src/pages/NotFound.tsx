import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <main
      className="not-found-page min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"
      aria-labelledby="not-found-title"
    >
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <AlertCircle
              className="h-16 w-16 text-red-500"
              aria-hidden="true"
            />
          </div>
          <h1
            id="not-found-title"
            className="text-4xl font-bold text-slate-900 mb-2"
          >
            404
          </h1>
          <h2 className="text-xl font-semibold text-slate-700 mb-4">
            Página não encontrada
          </h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            A página que você procura não existe ou foi movida.
          </p>
          <Button
            onClick={() => setLocation("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Home className="w-4 h-4 mr-2" aria-hidden="true" />
            Voltar ao catálogo
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
