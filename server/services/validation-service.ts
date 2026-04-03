import Groq from "groq-sdk";

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suggestedName?: string;
}

export class ValidationService {
  private groq: Groq | null;

  constructor(groqApiKey?: string) {
    this.groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;
  }

  async validatePlayerName(name: string): Promise<ValidationResult> {
    try {
      const trimmedName = name.trim();

      if (!trimmedName || trimmedName.length < 2) {
        return { isValid: false, reason: "Le nom doit contenir au moins 2 caractères" };
      }

      if (trimmedName.length > 20) {
        return { isValid: false, reason: "Le nom ne peut pas dépasser 20 caractères" };
      }

      if (!this.groq) {
        return this.validateNameBasic(name);
      }

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Tu es un modérateur de contenu pour un jeu familial français appelé "Langue au chat".
          Analyse si le nom d'utilisateur proposé est approprié pour un jeu familial.

          Critères de validation :
          - Pas de contenu offensant, vulgaire ou inapproprié
          - Pas d'incitation à la haine ou de discrimination
          - Adapté à tous les âges
          - Pas de références sexuelles explicites
          - Pas de promotion de violence

          Réponds UNIQUEMENT en JSON avec ce format exact :
          {
            "isValid": true/false,
            "reason": "raison si refusé",
            "suggestedName": "nom alternatif si possible"
          }`
          },
          {
            role: "user",
            content: `Valide ce nom d'utilisateur : "${trimmedName}"`
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("Pas de réponse de l'IA");
      }

      const result = JSON.parse(responseText);

      return {
        isValid: result.isValid === true,
        reason: result.reason || undefined,
        suggestedName: result.suggestedName || undefined
      };

    } catch (error) {
      console.error('Erreur validation IA:', error);
      return this.validateNameBasic(name);
    }
  }

  async validateGameWord(word: string, theme: string, letter: string, existingWords: string[] = []): Promise<ValidationResult> {
    const normalizedWord = word.trim().toLowerCase();

    // Vérification de doublon (même mot déjà soumis ce round)
    if (existingWords.some(w => w.toLowerCase() === normalizedWord)) {
      return {
        isValid: false,
        reason: 'Ce mot a déjà été proposé par un autre joueur pour cette lettre'
      };
    }

    try {
      if (!this.groq) {
        return this.validateWordBasic(word, letter);
      }

      const themeDescriptions: Record<string, string> = {
        animaux: "un animal spécifique (espèce ou race). Les termes génériques comme 'animal', 'bête', 'bestiole', 'créature' ne sont PAS valides",
        fruits: "un fruit spécifique (espèce ou variété). Les termes génériques comme 'fruit' ne sont PAS valides",
        legumes: "un légume spécifique (espèce ou variété). Les termes génériques comme 'légume' ne sont PAS valides",
        pays: "un pays reconnu existant dans le monde. Les termes génériques comme 'pays', 'nation', 'état' ne sont PAS valides"
      };

      const themeDesc = themeDescriptions[theme] || `un élément spécifique de la catégorie "${theme}"`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Tu es un validateur strict de mots pour le jeu "Langue au chat".

Vérifie si le mot proposé correspond à TOUS ces critères :
1. Commence par la lettre "${letter}"
2. Est ${themeDesc}
3. Est un mot français valide et correctement orthographié
4. Est approprié pour un jeu familial
5. N'est PAS un terme générique désignant la catégorie elle-même

Sois strict : refuse les mots inventés, les termes trop vagues, et les noms de catégorie.

Réponds UNIQUEMENT en JSON :
{
  "isValid": true/false,
  "reason": "raison si refusé"
}`
          },
          {
            role: "user",
            content: `Mot: "${word}", Thème: "${theme}", Lettre: "${letter}"`
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 150,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("Pas de réponse de l'IA");
      }

      const result = JSON.parse(responseText);
      return {
        isValid: result.isValid === true,
        reason: result.reason || undefined
      };

    } catch (error) {
      console.error('Erreur validation mot IA:', error);
      return this.validateWordBasic(word, letter);
    }
  }

  private validateNameBasic(name: string): ValidationResult {
    const trimmedName = name.trim();

    const bannedWords = [
      'admin', 'moderateur', 'modo', 'bot', 'system', 'serveur',
      'merde', 'putain', 'connard', 'salope', 'enculé'
    ];

    const lowerName = trimmedName.toLowerCase();

    for (const banned of bannedWords) {
      if (lowerName.includes(banned)) {
        return {
          isValid: false,
          reason: "Ce nom contient des mots non autorisés",
          suggestedName: this.generateSuggestedName()
        };
      }
    }

    const specialCharCount = (trimmedName.match(/[^a-zA-ZÀ-ÿ0-9\s]/g) || []).length;
    if (specialCharCount > 3) {
      return {
        isValid: false,
        reason: "Trop de caractères spéciaux",
        suggestedName: trimmedName.replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '').trim()
      };
    }

    return { isValid: true };
  }

  private validateWordBasic(word: string, letter: string): ValidationResult {
    const normalizedWord = word.trim().toLowerCase();
    const normalizedLetter = letter.toLowerCase();

    if (!normalizedWord.startsWith(normalizedLetter)) {
      return {
        isValid: false,
        reason: `Le mot doit commencer par la lettre ${letter.toUpperCase()}`
      };
    }

    return { isValid: true };
  }

  private generateSuggestedName(): string {
    const adjectives = ['Rapide', 'Malin', 'Sage', 'Joyeux', 'Brillant', 'Sympa'];
    const nouns = ['Chat', 'Joueur', 'Pro', 'Expert', 'Maitre', 'Champion'];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 999) + 1;

    return `${adj}${noun}${num}`;
  }
}
