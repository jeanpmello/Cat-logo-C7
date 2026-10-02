// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Router } from "wouter";
import App from "./App";

afterEach(cleanup);

function useUnknownRoute(): [string, (path: string) => void] {
  const [path, setPath] = useState("/rota-inexistente");
  return [path, setPath];
}

describe("roteamento da aplicação", () => {
  it("usa a página 404 existente para caminhos desconhecidos", async () => {
    render(
      <Router hook={useUnknownRoute}>
        <App />
      </Router>
    );

    expect(
      await screen.findByRole("heading", { name: "Página não encontrada" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Voltar ao catálogo" })
    ).toBeTruthy();
  });
});
