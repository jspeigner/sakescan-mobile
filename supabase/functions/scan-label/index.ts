import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SakeMatch {
  id: string;
  name: string;
  name_japanese: string | null;
  brewery: string;
  type: string | null;
  subtype: string | null;
  region: string | null;
  prefecture: string | null;
  description: string | null;
  rice_variety: string | null;
  polishing_ratio: number | null;
  alcohol_percentage: number | null;
  image_url: string | null;
  average_rating: number | null;
  total_ratings: number;
}

interface OpenAIAnalysisResult {
  name: string;
  name_japanese?: string;
  brewery: string;
  type: string;
  subtype?: string;
  prefecture?: string;
  region?: string;
  description: string;
  tasting_notes?: string;
  food_pairings?: string;
  rice_variety?: string;
  polishing_ratio?: number;
  alcohol_percentage?: number;
  flavor_profile?: string[];
  serving_temperature?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request body
    const { image_base64 } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ success: false, message: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return new Response(
        JSON.stringify({ code: 500, message: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Use OpenAI Vision to analyze the image
    console.log('Analyzing image with OpenAI Vision...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this sake bottle label and extract ALL information you can find. Return a JSON object with the following structure:

{
  "name": "English name of the sake",
  "name_japanese": "Japanese name (if visible)",
  "brewery": "Brewery name",
  "type": "Main type (e.g., Junmai, Ginjo, Daiginjo, Honjozo)",
  "subtype": "Subtype if applicable (e.g., Ginjo for Junmai Ginjo)",
  "prefecture": "Prefecture/region in Japan",
  "region": "Broader region",
  "description": "2-3 sentence description of this sake",
  "tasting_notes": "Flavor profile and tasting notes (what it tastes like)",
  "food_pairings": "Recommended food pairings",
  "rice_variety": "Type of rice used if mentioned",
  "polishing_ratio": 50 (as a number, percentage of rice remaining after polishing),
  "alcohol_percentage": 15.5 (as a number),
  "flavor_profile": ["Crisp", "Floral", "Smooth"] (array of flavor descriptors),
  "serving_temperature": ["Chilled", "Room"] (recommended serving temperatures)
}

Be thorough and provide detailed, accurate information. If you can't determine something, omit that field. The description should be informative and explain what makes this sake special.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image_base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to analyze image with OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiContent = openaiData.choices[0]?.message?.content;

    if (!aiContent) {
      return new Response(
        JSON.stringify({ success: false, message: 'No analysis result from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON from OpenAI response
    let sakeInfo: OpenAIAnalysisResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      sakeInfo = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', aiContent);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to parse AI analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OpenAI extracted info:', sakeInfo);

    // Step 2: Try to find existing match in database by name and brewery
    const { data: existingSake, error: searchError } = await supabase
      .from('sake')
      .select('*')
      .or(`name.ilike.%${sakeInfo.name}%,name_japanese.ilike.%${sakeInfo.name_japanese || ''}%`)
      .ilike('brewery', `%${sakeInfo.brewery}%`)
      .limit(1)
      .maybeSingle();

    if (searchError) {
      console.error('Database search error:', searchError);
    }

    // If found, return the match
    if (existingSake) {
      console.log('Found existing sake match:', existingSake.id);
      return new Response(
        JSON.stringify({
          success: true,
          matched_sake: existingSake,
          extracted: sakeInfo,
          message: 'Match found in database',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: No match found - create new sake entry
    console.log('No match found, creating new sake entry...');

    const { data: newSake, error: insertError } = await supabase
      .from('sake')
      .insert({
        name: sakeInfo.name,
        name_japanese: sakeInfo.name_japanese || null,
        brewery: sakeInfo.brewery,
        type: sakeInfo.type || null,
        subtype: sakeInfo.subtype || null,
        region: sakeInfo.region || null,
        prefecture: sakeInfo.prefecture || null,
        description: sakeInfo.description || null,
        rice_variety: sakeInfo.rice_variety || null,
        polishing_ratio: sakeInfo.polishing_ratio || null,
        alcohol_percentage: sakeInfo.alcohol_percentage || null,
        average_rating: null,
        total_ratings: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert new sake:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to save new sake to database',
          error: insertError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created new sake entry:', newSake.id);

    return new Response(
      JSON.stringify({
        success: true,
        matched_sake: newSake,
        extracted: sakeInfo,
        message: 'New sake added to database',
        is_new: true,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scan-label function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
