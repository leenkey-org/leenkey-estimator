#!/usr/bin/env node
// Relevance of the knowledge search (L1-27, criterion « recherche test
// pertinente sur les fiches de faq-cedric-v2.md »): questions worded as a
// seller or a buyer would, never the words of the card, each with the card
// expected; and off-topic questions, shown for reference. Runs against a
// project whose cards are embedded (npm run kb:import), as seed accounts.
// Environment: KB_SUPABASE_URL, KB_SUPABASE_ANON_KEY, SEED_PASSWORD.
// Prints, for each question, the rank of the expected card and the
// similarities; exits 1 when the expected card is among the 5 returned for
// less than 90 % of the questions. Off-topic questions still return cards
// (no threshold separates them): the model judges, L1-28.
const url = process.env.KB_SUPABASE_URL;
const anonKey = process.env.KB_SUPABASE_ANON_KEY;
const password = process.env.SEED_PASSWORD;

const CASES = [
  ["seller", "Combien je vais payer pour être accompagné ?", ["Combien coûtent les formules ?"]],
  [
    "seller",
    "Est-ce que je peux mettre mon appartement en ligne sans payer ?",
    [
      "Puis-je publier gratuitement mon bien sur Leenkey ?",
      "Est-ce vraiment possible de vendre gratuitement avec Leenkey ?",
    ],
  ],
  [
    "seller",
    "Il me faut quels diagnostics pour vendre ma maison ?",
    [
      "Quels diagnostics dois-je réaliser ?",
      "Dois-je avoir tous les diagnostics avant de mettre mon annonce en ligne ?",
    ],
  ],
  [
    "seller",
    "Qui fait visiter ma maison aux acheteurs ?",
    ["Qui effectue les visites ?", "Qui organise les visites ?"],
  ],
  [
    "seller",
    "Beaucoup de monde vient voir mais personne ne fait d'offre",
    ["J'ai plusieurs visites mais aucune offre. Que faire ?"],
  ],
  [
    "seller",
    "Je dois prendre le même notaire que l'acheteur ?",
    ["Vendeur et acquéreur doivent-ils avoir le même notaire ?"],
  ],
  [
    "seller",
    "C'est quoi une condition suspensive dans un compromis ?",
    ["Qu'est-ce qu'une condition suspensive ?"],
  ],
  [
    "seller",
    "Je peux changer le texte de mon annonce une fois qu'elle est en ligne ?",
    ["Puis-je modifier mon annonce après publication ?"],
  ],
  [
    "seller",
    "Est-ce que l'intelligence artificielle peut écrire la description ?",
    ["L'IA peut-elle rédiger mon annonce ?"],
  ],
  [
    "seller",
    "Comment savoir à quel prix mettre mon bien ?",
    ["Comment connaître la valeur de mon bien ?", "Puis-je fixer moi-même mon prix ?"],
  ],
  [
    "seller",
    "Vous contrôlez que l'acheteur a bien obtenu son prêt ?",
    [
      "Leenkey valide-t-il le financement ?",
      "Que signifie « justificatif vérifié » ?",
      "Comment savoir si un acquéreur est sérieux ?",
    ],
  ],
  ["seller", "Vous êtes une agence ?", ["Leenkey est-il une agence immobilière ?"]],
  [
    "seller",
    "J'ai pris Accompagné, combien pour monter en Sérénité ?",
    [
      "J'ai déjà payé Accompagné. Dois-je payer 1 500 € pour passer à Sérénité ?",
      "Puis-je changer de formule pendant ma vente ?",
    ],
  ],
  [
    "seller",
    "À quel moment ma vente est considérée comme finie ?",
    ["Quand ma vente est-elle terminée dans Leenkey ?"],
  ],
  [
    "buyer",
    "Est-ce que c'est payant pour les acheteurs ?",
    ["Dois-je payer pour utiliser Leenkey comme acquéreur ?"],
  ],
  [
    "buyer",
    "Je peux proposer moins que le prix affiché ?",
    ["Puis-je proposer un prix inférieur au prix demandé ?"],
  ],
  [
    "buyer",
    "Le propriétaire voit mes relevés bancaires ?",
    ["Le vendeur voit-il mes documents financiers ?"],
  ],
  [
    "buyer",
    "Je veux annuler l'offre que j'ai faite",
    ["Puis-je retirer mon offre d'achat ?", "Puis-je modifier une offre déjà envoyée ?"],
  ],
  [
    "buyer",
    "Si la banque refuse mon crédit, c'est de votre faute ?",
    ["Leenkey est-il responsable si mon prêt est refusé ?"],
  ],
  ["buyer", "Comment j'écris au vendeur d'une maison ?", ["Comment contacter un propriétaire ?"]],
];
const OFF_TOPIC = [
  ["seller", "Quelle est la recette de la tarte tatin ?"],
  ["buyer", "Quel temps fera-t-il demain à Paris ?"],
];

function fail(message) {
  console.error(`kb-eval: ${message}`);
  process.exit(1);
}
if (!url || !anonKey || !password)
  fail("KB_SUPABASE_URL, KB_SUPABASE_ANON_KEY and SEED_PASSWORD are required.");

async function signIn(email) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) fail(`sign in of ${email}: ${response.status}`);
  return (await response.json()).access_token;
}

async function embed(token, texts) {
  const response = await fetch(`${url}/functions/v1/embed`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ input: texts }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) fail(`embed: ${response.status}`);
  return (await response.json()).embeddings;
}

async function search(token, vector, query, audience) {
  const response = await fetch(`${url}/rest/v1/rpc/search_knowledge`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      p_embedding: `[${vector.join(",")}]`,
      p_query: query,
      p_audience: audience,
      p_limit: 5,
    }),
  });
  if (!response.ok) fail(`search: ${response.status} ${await response.text()}`);
  return response.json();
}

const tokens = {
  seller: await signIn("seller_a@test.leenkey.fr"),
  buyer: await signIn("buyer_c@test.leenkey.fr"),
};
let top1 = 0;
let top3 = 0;
let top5 = 0;
for (const [audience, question, expected] of CASES) {
  const [vector] = await embed(tokens[audience], [question]);
  const cards = await search(tokens[audience], vector, question, audience);
  const rank = cards.findIndex((card) => expected.includes(card.question));
  if (rank === 0) top1 += 1;
  if (rank >= 0 && rank < 3) top3 += 1;
  if (rank >= 0) top5 += 1;
  console.log(
    `${rank >= 0 ? `${rank + 1} ` : "✗ "} ${audience.padEnd(6)} ${question}\n` +
      cards
        .slice(0, 3)
        .map((card) => `      ${card.similarity.toFixed(3)} ${card.question}`)
        .join("\n"),
  );
}
for (const [audience, question] of OFF_TOPIC) {
  const [vector] = await embed(tokens[audience], [question]);
  const cards = await search(tokens[audience], vector, question, audience);
  console.log(
    `—  ${audience.padEnd(6)} ${question}\n      ${(cards[0]?.similarity ?? 0).toFixed(3)} ${cards[0]?.question ?? "(none)"}`,
  );
}
const total = CASES.length;
console.log(
  `\nExpected card first: ${top1}/${total} · in the top 3: ${top3}/${total} · among the 5 returned: ${top5}/${total}`,
);
// The assistant reads the 5 cards returned: the expected one must be among them.
if (top5 / total < 0.9) process.exit(1);
