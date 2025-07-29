import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';

// Ensure this route runs in Node.js
export const runtime = 'nodejs';

// Initialize Supabase and SendGrid
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request) {
  try {
    // Parse form data
    const formData = await request.formData();
    const mieter = formData.get('mieter');
    const ansprechpartner = formData.get('ansprechpartner');
    const telefonnummer = formData.get('telefonnummer');
    const email = formData.get('email');
    const adresse = formData.get('adresse');
    const mieteinheit = formData.get('mieteinheit');
    const vertragsnummer = formData.get('vertragsnummer');
    const titel = formData.get('titel');
    const beschreibung = formData.get('beschreibung');
    const gebaeudeteil = formData.get('gebaeudeteil');
    const etage = formData.get('etage');
    const raumbezeichnung = formData.get('raumbezeichnung');
    const zusatzlage = formData.get('zusatzlage');
    const tgaCategories = formData.getAll('tgaCategories[]');
    const allgemeinCategories = formData.getAll('allgemeinCategories[]');
    const mietCategories = formData.getAll('mietCategories[]');
    const sicherheitCategories = formData.getAll('sicherheitCategories[]');
    const sonstigesTGA = formData.get('sonstigesTGA');
    const sonstigesAllgemein = formData.get('sonstigesAllgemein');
    const sonstigesMiet = formData.get('sonstigesMiet');
    const sonstigesSicherheit = formData.get('sonstigesSicherheit');
    const dringlichkeit = formData.get('dringlichkeit');
    const zugangErforderlich = formData.get('zugangErforderlich');
    const timefenster = formData.get('timefenster');
    const zutrittsregelungen = formData.get('zutrittsregelungen');
    const datenschutz = formData.get('datenschutz');
    const files = formData.getAll('files[]');

    // Upload files to Supabase Storage temporarily and convert to base64 if image
    const tempFolder = crypto.randomUUID();
    const tempPaths = [];
    const imageBase64s = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || file.size === 0) continue;
      const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
      const filename = `file${i + 1}.${ext}`;
      const tempPath = `temp/${tempFolder}/${filename}`;

      // Upload to Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage.from('mangelimage').upload(tempPath, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (uploadError) {
        console.error('Upload error:', uploadError);
        return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
      }
      console.log('Uploaded file to:', tempPath);

      // If it's an image, convert to base64 for AI
      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
        const arrayBuffer = await file.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : (ext === 'png' ? 'image/png' : 'image/jpeg');
        const base64Url = `data:${mimeType};base64,${base64Image}`;
        console.log('Base64 length for file', i + 1, ':', base64Image.length);
        imageBase64s.push(base64Url);
      }
      tempPaths.push({ tempPath, filename });
    }

    // AI cost estimation
    const aiTextPrompt = `You are a damage management expert. Estimate the cost of repairing the damage shown in the attached images and described in the text. Use the images to inform your estimation.

Titel: ${titel}
Beschreibung: ${beschreibung}

Respond EXACTLY in this format: "<cost>€. <Explanation in one or two sentences.>" 
Use a number without commas (e.g., 50000, not 50,000) for the cost.`;

    let aiOutput = '0€. No estimation possible.';
    if (titel || beschreibung || imageBase64s.length > 0) {
      try {
        const content = [{ type: 'text', text: aiTextPrompt }];

        imageBase64s.forEach(base64 => {
          content.push({
            type: 'image_url',
            image_url: { url: base64 }
          });
        });

        const aiResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content }],
        });
        aiOutput = aiResponse.choices[0].message.content || '0€. AI response empty.';
        console.log('OpenAI full response:', aiOutput);
      } catch (aiError) {
        console.error('OpenAI error:', aiError);
        aiOutput = '0€. AI estimation failed: ' + aiError.message;
      }
    } else {
      console.log('Skipping AI: No titel, beschreibung, or images provided.');
    }

    const match = aiOutput.match(/^(\d+)€\.\s*(.*)/);
    const estimated_price_ki = match ? parseInt(match[1], 10) : null;
    const comment_ki = match ? match[2].trim() || 'No commentary' : 'No commentary';

    // Insert record in database
    const { data, error } = await supabase.from('mangelmanagement')
      .insert([{
        mieter,
        ansprechpartner,
        telefonnummer,
        email,
        adresse,
        mieteinheit,
        vertragsnummer,
        titel,
        beschreibung,
        gebaeudeteil,
        etage,
        raumbezeichnung,
        zusatzlage,
        tga_categories: JSON.stringify(tgaCategories),
        allgemein_categories: JSON.stringify(allgemeinCategories),
        miet_categories,
        sicherheit_categories,
        sonstiges_tga: sonstigesTGA,
        sonstiges_allgemein: sonstigesAllgemein,
        sonstiges_miet: sonstigesMiet,
        sonstiges_sicherheit: sonstigesSicherheit,
        dringlichkeit,
        zugang_erforderlich: zugangErforderlich,
        timefenster,
        zutrittsregelungen,
        datenschutz,
        estimated_price_ki,
        comment_ki
      }])
      .select();
    if (error || !data?.[0]) {
      console.error('DB insert error:', error);
      return new Response(JSON.stringify({ error: error?.message || 'Insert failed' }), { status: 500 });
    }
    const id = data[0].id;
    console.log('Inserted record with ID:', id);

    // Move uploaded files into final folder
    for (const { tempPath, filename } of tempPaths) {
      const { error: moveError } = await supabase.storage.from('mangelimage').move(tempPath, `${id}/${filename}`);
      if (moveError) {
        console.error('Move error:', moveError);
        // Optionally, clean up or handle, but continue
      } else {
        console.log('Moved file to:', `${id}/${filename}`);
      }
    }

    // Trigger n8n webhook to send confirmation email
    try {
      const n8nRes = await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          mieter,
          ansprechpartner,
          telefonnummer,
          email,
          adresse,
          mieteinheit,
          vertragsnummer,
          titel,
          beschreibung,
          gebaeudeteil,
          etage,
          raumbezeichnung,
          zusatzlage,
          tgaCategories,
          allgemeinCategories,
          mietCategories,
          sicherheitCategories,
          sonstigesTGA,
          sonstigesAllgemein,
          sonstigesMiet,
          sonstigesSicherheit,
          dringlichkeit,
          zugangErforderlich,
          timefenster,
          zutrittsregelungen,
          datenschutz,
          estimated_price_ki,
          comment_ki
        })
      });
      if (!n8nRes.ok) {
        const errText = await n8nRes.text();
        console.error('n8n webhook error:', n8nRes.status, errText);
      } else {
        console.log('n8n webhook triggered');
      }
    } catch (n8nErr) {
      console.error('Error calling n8n webhook:', n8nErr);
    }

    return new Response(JSON.stringify({ success: true, id }), { status: 200 });
  } catch (err) {
    console.error('Server error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}