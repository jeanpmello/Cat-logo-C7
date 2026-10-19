export type AdvisorProduct = {
  id: number;
  brand: string;
  model: string;
  processor?: string | null;
  ram?: string | null;
  storage?: string | null;
  gpu?: string | null;
  category?: string | null;
  price?: string | number | null;
  promoPrice?: string | number | null;
  imageUrl?: string | null;
};

export type AdvisorRequest = {
  goal: string;
  mobility: string;
  budget: string;
  priority: string;
  gameChoice?: string;
  programChoice?: string;
  freeText?: string;
};

export function interpretAdvisorFreeText(message: string): Pick<AdvisorRequest, "goal" | "freeText"> {
  const text = message.trim().toLowerCase();
  const goal = /montar|personaliz|desktop potente|pc gamer|computador gamer/.test(text)
    ? "montar"
    : /jogo|jogar|gamer|fortnite|warzone|valorant|gta|minecraft/.test(text)
      ? "jogos"
      : /editar|edição|criacao|criação|photoshop|premiere|autocad|blender|design/.test(text)
        ? "criacao"
        : /trabalho|empresa|atendimento|home office/.test(text)
          ? "trabalho"
          : /estud|aula|faculdade|escola/.test(text)
            ? "estudo"
            : /fixo|desktop|torre/.test(text) ? "desktop" : "basico";
  return { goal, freeText: message.trim() };
}

/** Identifica quando o catálogo deve abrir espaço para uma montagem personalizada. */
export function shouldSuggestCustomDesktop(request: Pick<AdvisorRequest, "goal" | "mobility" | "budget" | "priority">) {
  if (request.goal !== "desktop" || request.mobility === "leve") return false;
  return request.priority === "desempenho" || request.budget === "acima-4000";
}

export function advisorConversation(request: Pick<AdvisorRequest, "goal" | "mobility" | "budget" | "priority"> & { step: number; totalSteps: number }) {
  if (request.step === 0) return { title: "Vamos conversar sobre o que você realmente precisa.", intro: "Eu faço algumas perguntas rápidas e te explico o motivo de cada indicação — sem empurrar uma configuração que não combine com você." };
  if (request.step >= request.totalSteps) return { title: "Separei estas opções pensando no seu dia a dia.", intro: "A primeira é a que mais combina com o que você me contou, entre os equipamentos disponíveis hoje. Se nenhuma delas parecer perfeita, a equipe C7 pode ajustar a configuração com você." };
  if (request.goal === "jogos") return { title: "Boa, já entendi o caminho.", intro: "Agora vou cruzar o tipo de jogo, mobilidade e orçamento para não te indicar uma máquina que prometa mais do que entrega." };
  if (request.goal === "criacao") return { title: "Perfeito — vamos cuidar do desempenho.", intro: "Quero entender seu programa e sua rotina para equilibrar velocidade, memória e custo sem complicar os termos técnicos." };
  if (request.goal === "desktop") return { title: "Entendi: você quer algo para ficar no lugar.", intro: "Vou priorizar desktops estáveis e potentes. Se você precisar de algo mais específico, também posso te encaminhar para uma montagem personalizada." };
  if (request.mobility === "leve") return { title: "Entendi, mobilidade é importante para você.", intro: "Vou dar mais peso a notebooks práticos, leves e rápidos para acompanhar sua rotina." };
  return { title: "Ótimo, já estou entendendo seu perfil.", intro: "Mais uma ou duas respostas e eu te mostro opções disponíveis hoje, com o que gostei e o que vale confirmar." };
}

export type GameProfile = {
  label: string;
  demand: "leve" | "intermediario" | "alto" | "muito-alto";
  needsDedicatedGpu: boolean;
  note: string;
};

export type Recommendation<T extends AdvisorProduct = AdvisorProduct> = {
  product: T;
  score: number;
  compatibility: number;
  tier: "recommended" | "possible" | "not-recommended";
  reasons: string[];
  limitations: string[];
};

export function numericValue(value: unknown) {
  const match = String(value ?? "").replace(/,/g, ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function currentPrice(product: AdvisorProduct) {
  return numericValue(product.promoPrice || product.price);
}

export function storageScore(storage: unknown) {
  const text = String(storage ?? "").toLowerCase();
  const capacity = numericValue(text);
  return text.includes("ssd") ? 100 + capacity / 10 : capacity / 20;
}

export function processorScore(product: AdvisorProduct) {
  const text = String(product.processor ?? "").toLowerCase();
  const numbers = text.match(/\d+/g)?.map(Number) ?? [];
  const generation = numbers.at(-1) ?? 0;
  let family = text.includes("i7") || text.includes("ryzen 7") ? 85 : text.includes("i5") || text.includes("ryzen 5") ? 65 : text.includes("i3") || text.includes("ryzen 3") ? 42 : text.includes("celeron") || text.includes("pentium") ? 22 : 30;
  return family + Math.min(generation, 14) * 2;
}

export function analyzeGame(gameChoice = "", freeText = ""): GameProfile {
  const text = `${gameChoice} ${freeText}`.toLowerCase();
  if (/cyberpunk|red dead|alan wake|starfield|hogwarts|elden ring/.test(text)) return { label: freeText || "jogo pesado", demand: "muito-alto", needsDedicatedGpu: true, note: "priorize placa de vídeo dedicada, 16 GB de RAM ou mais e boa refrigeração" };
  if (/warzone|apex|fortnite|valorant|counter.?strike|cs2|overwatch|pubg/.test(text)) return { label: freeText || "jogo competitivo", demand: "alto", needsDedicatedGpu: true, note: "priorize GPU dedicada e memória suficiente para manter estabilidade" };
  if (/gta|forza|fifa|ea fc|racing|rainbow six|rocket league/.test(text)) return { label: freeText || "jogo intermediário", demand: "intermediario", needsDedicatedGpu: true, note: "uma GPU dedicada é recomendada para jogar com mais conforto" };
  if (/minecraft|roblox|sims|terraria|among us|league of legends|lol|valorant/.test(text)) return { label: freeText || "jogo leve", demand: "leve", needsDedicatedGpu: false, note: "8 GB de RAM e SSD já oferecem uma boa base" };
  return { label: freeText || "jogo informado", demand: "intermediario", needsDedicatedGpu: false, note: "a equipe pode confirmar os requisitos exatos antes da compra" };
}

export function analyzeProgram(programChoice = "", freeText = "") {
  const text = `${programChoice} ${freeText}`.toLowerCase();
  const label = freeText || programChoice || "programa informado";
  if (/premiere|after effects|davinci|resolve|3d|blender|autocad|solidworks/.test(text)) return { label, demand: "alto" as const, needsDedicatedGpu: true, note: "priorize 16 GB de RAM, SSD e GPU dedicada" };
  if (/photoshop|illustrator|lightroom|figma|canva/.test(text)) return { label, demand: "intermediario" as const, needsDedicatedGpu: false, note: "8–16 GB de RAM e SSD costumam oferecer uma boa base" };
  return { label, demand: "intermediario" as const, needsDedicatedGpu: false, note: "confirme os requisitos oficiais do programa antes da compra" };
}

function budgetLimit(budget: string) {
  if (budget === "ate-1500") return 1500;
  if (budget === "ate-2500") return 2500;
  if (budget === "ate-4000") return 4000;
  if (budget === "acima-4000") return Number.POSITIVE_INFINITY;
  return null;
}

export function recommendProducts<T extends AdvisorProduct>(products: T[], request: AdvisorRequest): Recommendation<T>[] {
  const game = analyzeGame(request.gameChoice, request.freeText);
  const program = analyzeProgram(request.goal === "criacao" ? request.programChoice : "", request.goal === "criacao" ? request.freeText : "");
  const limit = budgetLimit(request.budget);
  return products.map((product): Recommendation<T> => {
    const price = currentPrice(product);
    const ram = numericValue(product.ram);
    const processor = processorScore(product);
    const storage = storageScore(product.storage);
    const hasGpu = Boolean(String(product.gpu ?? "").trim()) && !/integrada|integrated|não informado/i.test(String(product.gpu ?? ""));
    let score = processor + storage + ram * 8;
    const reasons: string[] = [];
    const limitations: string[] = [];
    if (request.goal === "jogos" || request.goal === "criacao") {
      score += hasGpu ? 180 : -80;
      if (hasGpu) reasons.push("tem placa de vídeo informada");
      else if (request.goal === "jogos") limitations.push("não há placa de vídeo dedicada informada");
    }
    if (request.goal === "criacao") {
      if (program.needsDedicatedGpu && !hasGpu) limitations.push(`para ${program.label}, a GPU dedicada é recomendada`);
      if (program.demand === "alto" && ram < 16) limitations.push("16 GB de RAM seriam mais adequados para este uso");
      if (program.demand === "alto" && hasGpu) reasons.push("a GPU informada ajuda em criação e edição");
    }
    if (request.goal === "desktop") score += product.category === "Desktop" ? 150 : -40;
    if (request.mobility === "leve") score += product.category === "Notebook" ? 100 : -150;
    if (request.mobility === "fixo") score += product.category === "Desktop" ? 100 : 0;
    if (limit !== null) {
      if (price > 0 && price <= limit) { score += 150; reasons.push("está dentro do orçamento"); }
      else if (price > limit) { score -= Math.min(180, (price - limit) / 5); limitations.push("fica acima do orçamento escolhido"); }
    }
    if (request.priority === "preco") score -= price / 15;
    if (request.priority === "desempenho") score += processor * 2 + (hasGpu ? 100 : 0);
    if (request.priority === "rapidez" && storage >= 100) reasons.push("SSD favorece respostas mais rápidas");
    if (request.priority === "equilibrio") score += processor * 2 - price / 25;
    if (request.goal === "jogos") {
      const demandPenalty = { leve: 0, intermediario: 50, alto: 120, "muito-alto": 220 }[game.demand];
      score += (hasGpu ? 120 : -demandPenalty);
      if (game.needsDedicatedGpu && !hasGpu) limitations.push(`para ${game.label}, a GPU dedicada é recomendada`);
      if (ram >= 16) reasons.push("16 GB de RAM ajudam em jogos e multitarefa");
      else if (game.demand === "alto" || game.demand === "muito-alto") limitations.push("16 GB de RAM seriam mais adequados");
    }
    if (request.goal === "estudo" || request.goal === "trabalho" || request.goal === "basico") {
      if (ram < 8) { score -= 55; limitations.push("8 GB de RAM oferecem uma experiência mais confortável"); }
      if (storage < 100) { score -= 35; limitations.push("um SSD ajudaria na agilidade do dia a dia"); }
    }
    if (ram >= 8) reasons.push("memória adequada para multitarefa");
    if (storage >= 100) reasons.push("armazenamento SSD favorece agilidade");
    const compatibility = Math.max(25, Math.min(98, Math.round(58 + score / 18 - limitations.length * 9)));
    const tier = compatibility >= 78 && limitations.length <= 1 ? "recommended" : compatibility >= 58 ? "possible" : "not-recommended";
    return { product, score, compatibility, tier, reasons: Array.from(new Set(reasons)).slice(0, 3), limitations: Array.from(new Set(limitations)).slice(0, 2) };
  }).sort((a, b) => b.score - a.score);
}

export function recommendationLabel(recommendation?: Pick<Recommendation, "tier" | "compatibility">) {
  if (!recommendation) return "Análise indisponível";
  if (recommendation.tier === "recommended" && recommendation.compatibility >= 85) return "Melhor encaixe";
  if (recommendation.tier === "recommended") return "Boa recomendação";
  if (recommendation.tier === "possible") return "Alternativa possível";
  return "Precisa confirmar";
}
