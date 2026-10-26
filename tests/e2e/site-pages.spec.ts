import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-42: /concept, /tarifs and /faq in V2 (DECISIONS 2026-10-19). Without a
// database (CI), /tarifs says the plans could not be read; with the seed
// (E2E_SEED=1), it shows the three plans of the plans table. L1-43:
// /investir, /qui-sommes-nous, then the legal notice and the CGU of the V1 on
// the legal page template. L1-45: /contact, the form of the home page.

const seeded = process.env.E2E_SEED === "1";

async function seriousViolations(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

test.describe("pages du site en V2", () => {
  for (const [path, title] of [
    ["/concept", "Combien vaut vraiment votre bien ?"],
    ["/tarifs", "Une formule pour chaque vendeur."],
    ["/faq", "Tout ce que vous vous demandez, sans détour."],
    ["/investir", "L'immobilier français se réinvente. Soyez-en."],
    ["/qui-sommes-nous", "Rendre la vente immobilière enfin simple, humaine et transparente."],
    ["/contact", "Parlons-en ensemble."],
  ] as const) {
    test(`${path} : titre, en-tête et pied V2, aucune violation sérieuse @a11y`, async ({
      page,
      isMobile,
    }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.locator(".lk-nav-logo")).toHaveCount(0);
      await expect(
        page.getByRole("contentinfo").getByRole("navigation", { name: "Découvrir Leenkey" }),
      ).toBeVisible();
      if (isMobile) await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()?.width ?? 0,
      );
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  test("/concept : les corrections de la V1 (exclusivité, formule gratuite)", async ({ page }) => {
    await page.goto("/concept");
    await expect(page.getByText("diffusion en exclusivité sur Leenkey")).toBeVisible();
    await expect(page.getByText(/portails/)).toHaveCount(0);
    await expect(page.getByText("la formule Autonomie est entièrement gratuite")).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Valoriser mon bien", exact: true }),
    ).toHaveAttribute("href", "/estimer");
    await expect(
      page.getByRole("link", { name: "Valoriser mon bien gratuitement" }),
    ).toHaveAttribute("href", "/estimer");
  });

  test("/faq : les réponses s'ouvrent au clavier, sans chiffre inventé", async ({ page }) => {
    await page.goto("/faq");
    const questions = page.locator("summary");
    await expect(questions).toHaveText([
      "Combien ça coûte, vraiment ?",
      "Suis-je vraiment accompagné, ou seul face à la plateforme ?",
      "Mes données et mes documents sont-ils en sécurité ?",
      "Combien de temps pour vendre ?",
      "Quelle est la différence avec une agence ?",
      "Et si je bloque en cours de route ?",
    ]);
    const answer = page.getByText("sont payées", { exact: false });
    await expect(answer).toBeHidden();
    await questions.first().focus();
    await page.keyboard.press("Enter");
    await expect(answer).toBeVisible();
    await expect(page.locator("details").first()).toContainText("Accompagné à 990 € TTC");
    await expect(page.getByText(/42 jours/)).toHaveCount(0);
  });

  test("/investir : sans projection ni chiffre sans source, ni diffusion vers des portails", async ({
    page,
  }) => {
    await page.goto("/investir");
    const main = page.getByRole("main");
    await expect(main).toContainText("des milliards d'euros");
    for (const removed of [
      /M€/,
      /MRR|ARR|NPS/,
      /10 milliards/,
      // The figures are written with narrow no-break spaces.
      /1[\s\u202f]000[\s\u202f]000/,
      /acteur dominant/,
      /100 premiers/,
      /diffusion auto/i,
    ]) {
      await expect(main.getByText(removed)).toHaveCount(0);
    }
    const milestone = main
      .getByRole("listitem")
      .filter({ hasText: "V2 — Automatisation et scale" });
    await expect(milestone).toContainText("En cours");
    await expect(main.getByRole("link", { name: /Contacter par WhatsApp/ })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/33613845451\?text=Bonjour%20C%C3%A9dric/,
    );
    await expect(main.getByRole("link", { name: /Écrire à l'équipe Leenkey/ })).toHaveAttribute(
      "href",
      /^mailto:contact\.leenkey@gmail\.com\?subject=Investir%20dans%20Leenkey&body=/,
    );
    // Every call to action leads to the form of the page.
    for (const name of ["Rejoindre l'aventure", "Parlons-en", "Rejoindre le projet"]) {
      await expect(main.getByRole("link", { name, exact: true })).toHaveAttribute(
        "href",
        "#formulaire",
      );
    }
  });

  test("/investir : le formulaire part vers /api/contact avec la source « investir »", async ({
    page,
  }) => {
    let body: { source?: string; data?: Record<string, string> } = {};
    await page.route("**/api/contact", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.goto("/investir#formulaire");
    const form = page.locator("#invest-form");
    await expect(form.locator("#if-motif option")).toHaveText([
      "Choisissez",
      "Je souhaite investir dans Leenkey",
      "Je veux vendre mon bien (question)",
      "Je suis un partenaire (notaire, conseiller…)",
      "Autre demande",
    ]);
    await form.locator('[name="motif"]').selectOption({ index: 1 });
    await form.locator('[name="prenom"]').fill("Test");
    await form.locator('[name="nom"]').fill("Recette");
    await form.locator('[name="email"]').fill("test@example.com");
    await form.locator('[name="message"]').fill("Message de recette");
    await form.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(page.locator("#invest-form ~ .form-success")).toBeVisible();
    expect(body.source).toBe("investir");
    expect(body.data?.motif).toBe("Investisseur");
  });

  test("/qui-sommes-nous : la photo de Cédric et les chemins vers le contact", async ({ page }) => {
    await page.goto("/qui-sommes-nous");
    const main = page.getByRole("main");
    const photo = main.getByRole("img", { name: "Cédric Da Cunha, fondateur de Leenkey" });
    await expect(photo).toBeVisible();
    expect(await photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(720);
    // The vision of /investir, where its section starts (L1-51).
    await expect(main.getByRole("link", { name: "Découvrir notre vision" })).toHaveAttribute(
      "href",
      "/investir#vision",
    );
    await expect(main.getByRole("link", { name: "Nous contacter" })).toHaveAttribute(
      "href",
      "/contact",
    );
    await expect(
      main.getByRole("link", { name: "Valoriser mon bien gratuitement" }),
    ).toHaveAttribute("href", "/estimer");
  });

  test("/contact : le formulaire de l'accueil part vers /api/contact", async ({ page }) => {
    let body: { source?: string; data?: Record<string, string> } = {};
    await page.route("**/api/contact", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.goto("/contact");
    await expect(page).toHaveTitle("Contact · Leenkey");
    const form = page.locator("#contact-form");
    await form.getByLabel("Motif de votre demande").selectOption("Partenaire");
    await form.getByLabel("Prénom").fill("Alice");
    await form.getByLabel("Nom", { exact: true }).fill("Martin");
    await form.getByLabel("Email").fill("alice@example.fr");
    await form.getByLabel("Votre message").fill("Bonjour, je suis notaire.");
    await form.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(page.locator(".form-success")).toBeVisible();
    expect(body.source).toBe("contact");
    expect(body.data?.prenom).toBe("Alice");
  });

  // L1-50: the labels of the V1 above the titles, in capitals by their style
  // (the text keeps its case for screen readers).
  for (const [path, eyebrows] of [
    ["/concept", ["L'idée de départ", "Le cœur du concept", "Ce que Leenkey ouvre ensuite"]],
    ["/tarifs", ["Phase de lancement · Freemium"]],
    ["/faq", ["Questions fréquentes"]],
    [
      "/investir",
      [
        "Opportunité d'investissement · Proptech France 2026",
        "Ce que personne n'a encore vraiment résolu",
        "La vision",
        "État d'avancement",
        "Comment Leenkey crée de la valeur",
        "Le timing",
        "La vision 24 mois",
        "Ce que vous obtenez",
        "Questions fréquentes",
        "Échangeons",
      ],
    ],
    ["/qui-sommes-nous", ["Qui sommes-nous", "L'histoire", "Nos valeurs"]],
  ] as const) {
    test(`${path} : les surtitres de la V1, en capitales`, async ({ page }) => {
      await page.goto(path);
      const main = page.getByRole("main");
      for (const eyebrow of eyebrows) {
        const label = main.getByText(eyebrow, { exact: true });
        await expect(label).toBeVisible();
        await expect(label).toHaveCSS("text-transform", "uppercase");
      }
    });
  }

  test("/tarifs et /faq : sur le navy de la V1, les questions en cartes de verre", async ({
    page,
  }) => {
    const navy = "rgb(26, 43, 74)";
    await page.goto("/tarifs");
    expect(
      await page.locator("#tarifs").evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe(navy);
    await page.goto("/faq");
    expect(await page.locator("#faq").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      navy,
    );
    const question = page.locator("summary").first();
    await expect(question).toHaveCSS("color", "rgb(255, 255, 255)");
    // The focus ring turns white on navy, where the blue would not reach 3:1
    // (its colour alone would be white without any ring: currentColor).
    await question.focus();
    await expect(question).toHaveCSS("outline-style", "solid");
    await expect(question).toHaveCSS("outline-color", "rgb(255, 255, 255)");
  });

  test("/concept : les deux options de la V1 et l'outil sur navy", async ({ page }) => {
    await page.goto("/concept");
    const options = page.locator("#idee");
    await expect(options.getByText(/^Option [12]$/)).toHaveText(["Option 1", "Option 2"]);
    await expect(options.getByText("ou", { exact: true })).toBeVisible();
    const tool = page.locator("#outil");
    expect(await tool.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      "rgb(26, 43, 74)",
    );
    await expect(tool.locator("ol > li")).toHaveCount(4);
  });

  test("/investir : l'encart du marché, la frise et les trois sources de la V1", async ({
    page,
  }) => {
    await page.goto("/investir");
    const market = page.locator("#marche");
    // In the text of the agency, then in large beside it.
    await expect(market.getByText("15\u202f000\u202f€", { exact: true })).toHaveCount(2);
    await expect(
      market.getByText("prélevés sur une seule vente à 300\u202f000\u202f€", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("#avancement ol > li")).toHaveCount(6);
    const model = page.locator("#modele");
    await expect(model.getByText(/^Source [123]$/)).toHaveText([
      "Source 1",
      "Source 2",
      "Source 3",
    ]);
    await expect(model.getByRole("listitem").nth(2)).toContainText("À venir");
    await expect(page.getByText(/Source 3 · V2/)).toHaveCount(0);
  });

  test("/qui-sommes-nous : la photo de Cédric dans le hero, chargée en premier", async ({
    page,
  }) => {
    await page.goto("/qui-sommes-nous");
    const hero = page.locator("#qui-sommes-nous");
    const photo = hero.getByRole("img", { name: "Cédric Da Cunha, fondateur de Leenkey" });
    await expect(photo).toBeVisible();
    await expect(photo).toHaveAttribute("fetchpriority", "high");
    await expect(photo).not.toHaveAttribute("loading", "lazy");
    await expect(hero.locator("figcaption")).toContainText("Cédric Da Cunha");
    await expect(hero.locator("figcaption")).toContainText("Fondateur & CEO · Leenkey");
  });

  test("une adresse inconnue : la 404 de Façade, réponse 404 @a11y", async ({ page }) => {
    const response = await page.goto("/cette-page-n-existe-pas");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("Page introuvable · Leenkey");
    // Never indexed, and never a copy of the home page (app/layout.tsx).
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 1, name: "Cette page n'existe pas." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute(
      "href",
      "/",
    );
    // The whole screen on the blue flat of the brand (DESIGN.md 13.1): the
    // background under the top left corner, whatever element is there.
    expect(
      await page.evaluate(() => {
        for (let node = document.elementFromPoint(4, 4); node; node = node.parentElement) {
          const color = getComputedStyle(node).backgroundColor;
          if (color !== "rgba(0, 0, 0, 0)") return color;
        }
        return null;
      }),
    ).toBe("rgb(17, 86, 252)");
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("/tarifs sans base : le message d'indisponibilité", async ({ page }) => {
    test.skip(seeded, "base de seed : voir plus bas");
    await page.goto("/tarifs");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Les formules n'ont pas pu être chargées.",
    );
  });
});

test.describe("/tarifs (base de seed)", () => {
  test.skip(!seeded, "base de seed requise (E2E_SEED=1)");

  test("les trois formules de la table plans, Autonomie mise en avant", async ({ page }) => {
    await page.goto("/tarifs");
    const plans = page.locator("article");
    await expect(plans).toHaveCount(3);
    await expect(plans.getByRole("heading", { level: 2 })).toHaveText([
      "Autonomie",
      "Accompagné",
      "Sérénité",
    ]);
    await expect(plans.nth(0)).toContainText("Disponible gratuitement");
    await expect(plans.nth(0)).toContainText("Publication de l'annonce sur Leenkey");
    await expect(plans.nth(1)).toContainText("990 €");
    await expect(plans.nth(1)).toContainText("Tout Autonomie, plus :");
    await expect(plans.nth(1)).toContainText("Forfait fixe TTC · payé à la souscription");
    await expect(plans.nth(2)).toContainText("1 500 €");
    // Only the free plan is the primary action.
    await expect(
      plans.nth(0).getByRole("link", { name: "Commencer gratuitement" }),
    ).toHaveAttribute("href", "/estimer");
    // The V1 lists of another offer are gone.
    await expect(page.getByText("Garantie juridique")).toHaveCount(0);
  });

  test("« Mon économie vs agence » : l'économie indicative à la place du prix", async ({
    page,
  }) => {
    await page.goto("/tarifs");
    const plans = page.locator("article");
    // On navy, the white focus ring of the switch (L1-50), before any click:
    // after one, Chromium keeps a focus set by script without its ring.
    const chosen = page.getByRole("radio", { name: "Gratuit pendant le lancement" });
    await chosen.focus();
    await expect(chosen).toHaveCSS("outline-style", "solid");
    await expect(chosen).toHaveCSS("outline-color", "rgb(255, 255, 255)");
    await page.getByRole("radio", { name: "Mon économie vs agence" }).click();
    await expect(plans.nth(1)).toContainText("−14 010 € vs agence");
    await expect(plans.nth(2)).toContainText("−13 500 € vs agence");
    await expect(plans.nth(1)).toContainText("Économie indicative sur un bien à 350 000 €");
    await expect(plans.nth(0)).toContainText("Gratuit");
    await page.getByRole("radio", { name: "Gratuit pendant le lancement" }).click();
    await expect(plans.nth(1)).toContainText("990 €");
  });
});

test.describe("mentions légales et CGU de la V1", () => {
  for (const [path, title] of [
    ["/mentions-legales", "Mentions légales"],
    ["/cgu", "Conditions générales d'utilisation"],
  ] as const) {
    test(`${path} : le texte en vigueur, sans mention de rédaction @a11y`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.getByText("Cette page est en cours de rédaction.")).toHaveCount(0);
      await expect(page.locator(".lk-legal")).toHaveCount(0);
      await expect(
        page.getByRole("contentinfo").getByRole("navigation", { name: "Découvrir Leenkey" }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()?.width ?? 0,
      );
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  test("/mentions-legales garde ses ancres et ses liens", async ({ page }) => {
    await page.goto("/mentions-legales#rgpd");
    await expect(
      page.getByRole("heading", { name: "5. Données personnelles (RGPD)" }),
    ).toBeInViewport();
    await expect(
      page.locator("#cookies").getByRole("link", { name: "politique cookies" }),
    ).toHaveAttribute("href", "/cookies");
    await expect(page.getByRole("link", { name: "+33 6 13 84 54 51" })).toHaveAttribute(
      "href",
      "tel:+33613845451",
    );
  });

  test("/cgu : le sommaire mène à chaque article, version 1.0", async ({ page }) => {
    await page.goto("/cgu");
    await expect(page.getByText("Dernière mise à jour : 28 juin 2026 · Version 1.0")).toBeVisible();
    const toc = page.getByRole("navigation", { name: "Sommaire" });
    await expect(toc.getByRole("link")).toHaveCount(12);
    await toc.getByRole("link", { name: "5. Tarifs et paiement" }).click();
    await expect(page).toHaveURL(/\/cgu#tarifs$/);
    await expect(page.getByRole("heading", { name: "5. Tarifs et paiement" })).toBeInViewport();
    // No sticky header on a legal page: the article 24 px under the top of the screen.
    await expectAnchorUnderHeaders(page, "tarifs", 24);
    await expect(page.getByRole("status").filter({ hasText: "Important :" })).toHaveCount(0);
    await expect(page.getByText("pas une agence immobilière")).toBeVisible();
  });
});

// The sticky headers at the top of the screen never cover an anchor, and an
// anchor lands right under them: the scroll padding of the V1 (145 px) left
// every one of them that much too low (app/globals.css). Measured on the page,
// never written in the test: the visible elements marked data-sticky-header
// (SiteMenu, TopNav) or data-sticky-subheader (the wizard, a conversation).
async function stickyStack(page: Page) {
  return page.evaluate(() => ({
    padding: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
    stack: [...document.querySelectorAll("[data-sticky-header], [data-sticky-subheader]")]
      .map((element) => element.getBoundingClientRect().height)
      .reduce((sum, height) => sum + height, 0),
  }));
}

/** The top of the anchor, `gap` px under the sticky headers (polled: smooth scroll, fonts). */
async function expectAnchorUnderHeaders(page: Page, id: string, gap = 0) {
  await expect
    .poll(() =>
      page.evaluate(
        ({ anchor, gap }) => {
          const top = document.getElementById(anchor)?.getBoundingClientRect().top;
          if (top === undefined) return `#${anchor} missing`;
          const stack = [
            ...document.querySelectorAll("[data-sticky-header], [data-sticky-subheader]"),
          ]
            .map((element) => element.getBoundingClientRect().height)
            .reduce((sum, height) => sum + height, 0);
          return Math.abs(top - (stack + gap)) <= 2
            ? "under the headers"
            : `top ${Math.round(top)}, expected ${Math.round(stack + gap)}`;
        },
        { anchor: id, gap },
      ),
    )
    .toBe("under the headers");
}

test.describe("ancres sous les en-têtes collants", () => {
  test("la marge du défilement est celle des en-têtes collants, à 390, 768 et 1 280 px", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "les trois largeurs depuis le navigateur de bureau");
    // The site header; none on a legal page (G10); the header and the wizard on /estimer.
    for (const path of ["/", "/cgu", "/estimer"]) {
      await page.goto(path);
      for (const width of [390, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => document.fonts.ready);
        const { padding, stack } = await stickyStack(page);
        expect(
          Math.abs(padding - stack),
          `${path} at ${width}: ${padding} for ${stack}`,
        ).toBeLessThanOrEqual(1);
        if (path === "/cgu") expect(stack, path).toBe(0);
        else expect(stack, `${path} at ${width}`).toBeGreaterThan(0);
      }
    }
  });

  test("« Découvrir notre vision » arrive sur la vision de /investir", async ({ page }) => {
    // With the smooth scroll of the site (DESIGN.md 9): polled until it ends.
    await page.goto("/qui-sommes-nous");
    await page.getByRole("main").getByRole("link", { name: "Découvrir notre vision" }).click();
    await expect(page).toHaveURL(/\/investir#vision$/);
    await expectAnchorUnderHeaders(page, "vision");
  });

  for (const [path, id] of [
    ["/investir", "formulaire"],
    // The plans of the home page of direction C, the form of /contact.
    ["/", "formules"],
    ["/contact", "contact"],
  ] as const) {
    test(`${path}#${id} au chargement de la page`, async ({ page }) => {
      await page.goto(`${path}#${id}`);
      await expectAnchorUnderHeaders(page, id);
    });
  }
});
