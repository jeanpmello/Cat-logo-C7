import { describe, expect, it } from "vitest";
import { advisorConversation, analyzeGame, analyzeProgram, interpretAdvisorFreeText, recommendProducts, recommendationLabel, shouldSuggestCustomDesktop } from "./advisor";

const products = [
  { id: 1, brand: "C7", model: "Notebook Gamer", processor: "Intel Core i7", ram: "16 GB", storage: "SSD 512 GB", gpu: "RTX 3050", category: "Notebook", price: "R$ 3.500" },
  { id: 2, brand: "C7", model: "Notebook Básico", processor: "Intel Core i3", ram: "8 GB", storage: "SSD 256 GB", gpu: "Integrada", category: "Notebook", price: "R$ 1.500" },
];

describe("advisor recommendation engine", () => {
  it("interprets natural-language requests before the guided questions", () => {
    expect(interpretAdvisorFreeText("Preciso de um notebook para estudar até R$ 2500").goal).toBe("estudo");
    expect(interpretAdvisorFreeText("quero montar um PC gamer potente").goal).toBe("montar");
  });

  it("recognizes known and free-text games without inventing exact FPS guarantees", () => {
    expect(analyzeGame("outro", "Elden Ring").demand).toBe("muito-alto");
    expect(analyzeGame("outro", "meu jogo desconhecido").note).toContain("confirmar");
  });

  it("uses the selected creation program even when the user does not type it again", () => {
    expect(analyzeProgram("Premiere", "").needsDedicatedGpu).toBe(true);
    expect(analyzeProgram("Premiere", "").label).toBe("Premiere");
  });

  it("prioritizes a dedicated GPU for demanding games and explains the limitation", () => {
    const result = recommendProducts(products, { goal: "jogos", mobility: "leve", budget: "ate-4000", priority: "desempenho", gameChoice: "outro", freeText: "Elden Ring" });
    expect(result[0]?.product.id).toBe(1);
    expect(result[0]?.reasons.length).toBeGreaterThan(0);
    expect(result[1]?.limitations.join(" ")).toContain("GPU dedicada");
  });

  it("does not hide a product limitation just because it fits the price range", () => {
    const result = recommendProducts(products, { goal: "jogos", mobility: "tanto-faz", budget: "ate-1500", priority: "preco", gameChoice: "minecraft" });
    expect(result.some((item) => item.limitations.length > 0)).toBe(true);
    expect(result.every((item) => item.compatibility >= 25 && item.compatibility <= 98)).toBe(true);
  });

  it("labels recommendation confidence without presenting a limitation as a guarantee", () => {
    const result = recommendProducts(products, { goal: "criacao", mobility: "leve", budget: "ate-4000", priority: "equilibrio", programChoice: "Premiere" });
    expect(recommendationLabel(result[0])).toMatch(/encaixe|recomendação|possível|confirmar/);
    expect(result.some((item) => item.limitations.some((limitation) => limitation.includes("GPU dedicada")))).toBe(true);
  });

  it("suggests a custom desktop build for fixed high-performance profiles", () => {
    expect(shouldSuggestCustomDesktop({ goal: "desktop", mobility: "fixo", budget: "ate-4000", priority: "desempenho" })).toBe(true);
    expect(shouldSuggestCustomDesktop({ goal: "desktop", mobility: "fixo", budget: "acima-4000", priority: "equilibrio" })).toBe(true);
    expect(shouldSuggestCustomDesktop({ goal: "desktop", mobility: "leve", budget: "acima-4000", priority: "desempenho" })).toBe(false);
    expect(shouldSuggestCustomDesktop({ goal: "trabalho", mobility: "fixo", budget: "acima-4000", priority: "desempenho" })).toBe(false);
  });

  it("uses context-aware, human conversation copy without promising results", () => {
    expect(advisorConversation({ goal: "", mobility: "", budget: "", priority: "", step: 0, totalSteps: 4 }).title).toContain("realmente precisa");
    expect(advisorConversation({ goal: "jogos", mobility: "", budget: "", priority: "", step: 1, totalSteps: 5 }).intro).toContain("tipo de jogo");
    expect(advisorConversation({ goal: "trabalho", mobility: "", budget: "", priority: "", step: 4, totalSteps: 4 }).intro).toContain("disponíveis hoje");
  });
});
