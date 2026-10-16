import { describe, expect, it } from "vitest";
import { passwordStrength, splitFullName } from "@/core/auth/identity";
import { LEGAL_VERSIONS, missingLegalDocuments } from "@/lib/legal/versions";
import {
  fieldErrors,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";

const valid = {
  role: "buyer",
  fullName: "  Camille   Martin ",
  email: " Camille.Martin@Exemple.FR ",
  phone: "06 12 34 56 78",
  password: "un-mot-de-passe",
  acceptTerms: "on",
};

describe("signUpSchema", () => {
  it("accepts a complete form and normalises it", () => {
    const parsed = signUpSchema.parse(valid);
    expect(parsed.email).toBe("camille.martin@exemple.fr");
    expect(parsed.fullName).toBe("Camille   Martin");
  });

  it("accepts an empty phone (optional field)", () => {
    expect(signUpSchema.safeParse({ ...valid, phone: "" }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...valid, phone: "+33 6 12 34 56 78" }).success).toBe(true);
  });

  it("explains each invalid field in French", () => {
    const result = signUpSchema.safeParse({
      role: "admin",
      fullName: "C",
      email: "pas-un-email",
      phone: "appelle-moi",
      password: "court",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      role: "Choisissez « Je vends » ou « J'achète ».",
      fullName: "Indiquez votre prénom et votre nom.",
      email: "Cet email n'est pas valide.",
      phone: "Ce numéro n'est pas valide.",
      password: "8 caractères minimum.",
      acceptTerms:
        "Acceptez les conditions d'utilisation et la politique de confidentialité pour continuer.",
    });
  });

  it("refuses passwords that bcrypt would cut", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "x".repeat(73) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: "x".repeat(72) }).success).toBe(true);
  });
});

describe("other auth forms", () => {
  it("login does not check the password length", () => {
    expect(signInSchema.safeParse({ email: "a@b.fr", password: "1" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "a@b.fr", password: "" }).success).toBe(false);
  });

  it("reset requires two identical passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "nouveau-mdp",
      confirm: "nouveau-mdP",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      confirm: "Les deux mots de passe sont différents.",
    });
  });
});

describe("splitFullName", () => {
  it("first word is the first name, the rest the last name", () => {
    expect(splitFullName("Camille Martin")).toEqual({ firstName: "Camille", lastName: "Martin" });
    expect(splitFullName(" Anne  de la  Fontaine ")).toEqual({
      firstName: "Anne",
      lastName: "de la Fontaine",
    });
    expect(splitFullName("Cédric")).toEqual({ firstName: "Cédric", lastName: null });
  });
});

describe("passwordStrength", () => {
  it("grades length and variety", () => {
    expect(passwordStrength("")).toBeNull();
    expect(passwordStrength("abc")).toBe("weak");
    expect(passwordStrength("abcdefgh")).toBe("weak");
    expect(passwordStrength("abcdef12X")).toBe("fair");
    expect(passwordStrength("abcdefghijkl")).toBe("fair");
    expect(passwordStrength("Maison-91-Savigny")).toBe("strong");
  });
});

describe("missingLegalDocuments", () => {
  it("lists the texts whose current version is not accepted", () => {
    expect(missingLegalDocuments([])).toEqual(["cgu", "privacy"]);
    expect(
      missingLegalDocuments([
        { document: "cgu", version: LEGAL_VERSIONS.cgu },
        { document: "privacy", version: "2020-01-01" },
      ]),
    ).toEqual(["privacy"]);
    expect(
      missingLegalDocuments([
        { document: "cgu", version: LEGAL_VERSIONS.cgu },
        { document: "privacy", version: LEGAL_VERSIONS.privacy },
      ]),
    ).toEqual([]);
  });
});
