export interface SakeInfo {
  name: string;
  nameJapanese?: string;
  brewery: string;
  type: string;
  subtype?: string;
  prefecture?: string;
  region?: string;
  description: string;
  tastingNotes?: string;
  foodPairings?: string[];
  riceVariety?: string;
  polishingRatio?: number;
  alcoholPercentage?: number;
  flavorProfile?: string[];
  servingTemperature?: string[];
}

export interface ScanResult {
  success: boolean;
  sake?: SakeInfo;
  error?: string;
}

export interface MenuSakeItem {
  name: string;
  nameJapanese?: string;
  brewery?: string;
  type?: string;
  price?: string;
  size?: string;
  description?: string;
  flavorProfile?: string[];
  servingTemperature?: string[];
  alcoholPercentage?: number;
  polishingRatio?: number;
}

export interface MenuScanResult {
  success: boolean;
  sakes?: MenuSakeItem[];
  error?: string;
}

export async function scanSakeLabel(imageBase64: string): Promise<ScanResult> {
  try {
    const apiKey =
      process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() ||
      process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY?.trim();

    if (!apiKey) {
      console.error('OpenAI API key not found in environment variables');
      return {
        success: false,
        error:
          'API key not configured. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file (legacy: EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY).',
      };
    }

    console.log('🔍 Analyzing sake label with OpenAI Vision...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this sake bottle label and extract information. Return ONLY a JSON object (no markdown, no extra text) with this structure:

{
  "name": "English name of the sake",
  "nameJapanese": "Japanese name if visible",
  "brewery": "Brewery name",
  "type": "Main type (Junmai, Ginjo, Daiginjo, Honjozo, or Other)",
  "subtype": "Subtype if applicable",
  "prefecture": "Prefecture in Japan (e.g., Niigata, Kyoto)",
  "region": "Region (e.g., Kanto, Kansai)",
  "description": "2-3 sentence description of this sake",
  "tastingNotes": "What it tastes like - flavors, aroma, finish",
  "foodPairings": ["Sushi", "Tempura", "Grilled fish"],
  "riceVariety": "Type of rice used",
  "polishingRatio": 50,
  "alcoholPercentage": 15.5,
  "flavorProfile": ["Crisp", "Floral", "Smooth"],
  "servingTemperature": ["Chilled", "Room"]
}

Important:
- Be detailed and informative
- If you can't determine something, omit that field
- The description should explain what makes this sake special
- Return ONLY valid JSON, no markdown formatting`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);

      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid API key. Please check your OpenAI API key configuration.'
        };
      } else if (response.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again in a moment.'
        };
      } else if (response.status === 402) {
        return {
          success: false,
          error: 'OpenAI account has insufficient credits. Please add credits at platform.openai.com.'
        };
      }

      return {
        success: false,
        error: `OpenAI API error: ${response.status}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response:', data);
      return {
        success: false,
        error: 'No analysis result from OpenAI'
      };
    }

    console.log('📝 Raw OpenAI response:', content);

    // Parse the JSON response (handle markdown code blocks if present)
    let sakeInfo: SakeInfo;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      sakeInfo = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return {
        success: false,
        error: 'Failed to parse AI analysis. The image might not be a sake label.'
      };
    }

    // Validate we have at least name and brewery
    if (!sakeInfo.name || !sakeInfo.brewery) {
      return {
        success: false,
        error: 'Could not identify sake information. Please make sure the label is clearly visible.'
      };
    }

    console.log('✅ Successfully analyzed sake:', sakeInfo.name);

    return {
      success: true,
      sake: sakeInfo
    };

  } catch (error: any) {
    console.error('Error scanning sake label:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze label. Please check your internet connection.'
    };
  }
}

export async function scanSakeMenu(imageBase64: string): Promise<MenuScanResult> {
  try {
    const apiKey =
      process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() ||
      process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return {
        success: false,
        error: 'API key not configured. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.',
      };
    }

    console.log('📋 Analyzing sake menu with OpenAI Vision...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `This is a photo of a sake menu from a restaurant or bar. Extract EVERY sake listed on the menu. Return ONLY a JSON array (no markdown, no extra text) where each item has this structure:

[
  {
    "name": "English name of the sake",
    "nameJapanese": "Japanese name if visible",
    "brewery": "Brewery name if listed",
    "type": "Junmai, Ginjo, Daiginjo, Honjozo, Nigori, Sparkling, or Other",
    "price": "$14" or "¥1200" — include the currency symbol exactly as shown,
    "size": "Glass", "Carafe", "Bottle", "180ml", "300ml", "720ml", etc.,
    "description": "Brief 1-sentence description of this sake's character",
    "flavorProfile": ["Crisp", "Floral", "Smooth", "Fruity", "Dry", "Rich", "Umami", "Sweet"],
    "servingTemperature": ["Chilled", "Room", "Warm"],
    "alcoholPercentage": 15.5,
    "polishingRatio": 50
  }
]

Rules:
- Extract ALL sakes on the menu, not just the first one
- Keep prices exactly as shown on the menu
- Include the serving size if listed (glass, carafe, bottle, ml amount)
- If a sake appears at multiple sizes/prices, create a separate entry for each
- For flavorProfile: pick 2-4 descriptors based on the sake type and any tasting notes
- If you can identify the brewery, include it; otherwise omit
- If you cannot determine a field, omit it
- Return ONLY valid JSON, no markdown formatting`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 3000,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);

      if (response.status === 401) {
        return { success: false, error: 'Invalid API key.' };
      } else if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again in a moment.' };
      } else if (response.status === 402) {
        return { success: false, error: 'OpenAI account has insufficient credits.' };
      }

      return { success: false, error: `OpenAI API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'No analysis result from OpenAI' };
    }

    console.log('📝 Raw OpenAI menu response:', content);

    let sakes: MenuSakeItem[];
    try {
      const jsonMatch =
        content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) || content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      sakes = JSON.parse(jsonStr.trim());
    } catch {
      console.error('Failed to parse menu response:', content);
      return {
        success: false,
        error: 'Failed to parse menu. Make sure the menu is clearly visible.',
      };
    }

    if (!Array.isArray(sakes) || sakes.length === 0) {
      return {
        success: false,
        error: 'No sake items found on this menu. Try a clearer photo.',
      };
    }

    const valid = sakes.filter((s) => s.name);
    console.log(`✅ Found ${valid.length} sake items on menu`);

    return { success: true, sakes: valid };
  } catch (error: any) {
    console.error('Error scanning sake menu:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze menu. Check your internet connection.',
    };
  }
}
