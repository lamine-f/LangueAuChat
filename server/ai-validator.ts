import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suggestedName?: string;
}

export async function validatePlayerName(name: string): Promise<ValidationResult> {
  try {
    // Validation basique côté serveur
    const trimmedName = name.trim();
    
    if (!trimmedName || trimmedName.length < 2) {
      return {
        isValid: false,
        reason: "Le nom doit contenir au moins 2 caractères"
      };
    }
    
    if (trimmedName.length > 20) {
      return {
        isValid: false,
        reason: "Le nom ne peut pas dépasser 20 caractères"
      };
    }

    // Validation par IA avec Groq
    const completion = await groq.chat.completions.create({
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
      model: "llama3-70b-8192",
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
    
    // Fallback : validation basique en cas d'erreur IA
    const basicValidation = validateNameBasic(name);
    return basicValidation;
  }
}

// Validation basique de secours
function validateNameBasic(name: string): ValidationResult {
  const trimmedName = name.trim();
  
  // Liste de mots interdits basique
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
        suggestedName: generateSuggestedName()
      };
    }
  }
  
  // Vérification des caractères spéciaux excessifs
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

function generateSuggestedName(): string {
  const adjectives = ['Rapide', 'Malin', 'Sage', 'Joyeux', 'Brillant', 'Sympa'];
  const nouns = ['Chat', 'Joueur', 'Pro', 'Expert', 'Maitre', 'Champion'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999) + 1;
  
  return `${adj}${noun}${num}`;
}

export async function validateGameWord(word: string, theme: string, letter: string): Promise<ValidationResult> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Tu es un validateur de mots pour le jeu "Langue au chat".
          Vérifie si le mot proposé correspond aux critères :
          1. Commence par la lettre demandée
          2. Appartient à la catégorie/thème spécifié
          3. Est un mot français valide
          4. Est approprié pour un jeu familial
          
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
      model: "llama3-70b-8192",
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
    
    // Validation basique de secours
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
}